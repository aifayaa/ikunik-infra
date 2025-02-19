/* eslint-disable import/no-relative-packages */
import AVAILABLE_TYPES from '../userGeneratedContentsTypes.json';
import checkOwner from '../../libs/perms/checkOwner';
import emailTemplate from '../lib/emailUgcNotifyTemplate';
import errorMessage from '../../libs/httpResponses/errorMessage';
import patchUserGeneratedContents from '../lib/patchUserGeneratedContents';
import response from '../../libs/httpResponses/response.ts';
import sendEmailToAdmin from '../lib/sendEmailToAdmin';
import { getUserLanguage } from '../../libs/intl/intl';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

export default async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const userId = event.requestContext.authorizer.principalId;
    const userGeneratedContentsId = event.pathParameters.id;
    const bodyParsed = JSON.parse(event.body);
    const { data } = bodyParsed;

    if (!data) {
      throw new Error('missing_arguments');
    }

    [data].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('wrong_argument_type');
      }
    });

    const ugc = await checkOwner(
      appId,
      userGeneratedContentsId,
      COLL_USER_GENERATED_CONTENTS,
      'userId',
      userId
    );
    const { type } = ugc;

    switch (type) {
      case AVAILABLE_TYPES.article:
        if (
          !data.title ||
          !data.content ||
          !data.pictures ||
          !data.pictures.length
        ) {
          throw new Error('missing_arguments');
        }

        if (
          typeof data.title !== 'string' ||
          typeof data.content !== 'string'
        ) {
          throw new Error('wrong_argument_type');
        }
        break;
      case AVAILABLE_TYPES.comment:
        if (typeof data !== 'string') {
          throw new Error('wrong_argument_type');
        }
        break;
      default:
        break;
    }

    const lang = getUserLanguage(event.headers);

    const results = await patchUserGeneratedContents(
      appId,
      userId,
      userGeneratedContentsId,
      data,
      lang
    );

    /*
      try to send email to appAdmin
      if it failled for any reason just ignore error
      we don't want this request to be concidered as failed
      since content has successfully been edited

      This portion of code could be externalised in an
      other serverless function which could be called without
      waiting Promise to be resolved to permit a quick response
      to the requester
    */
    try {
      const { subject, body } = await emailTemplate(
        userId,
        appId,
        userGeneratedContentsId,
        lang,
        { isEdition: true }
      );
      await sendEmailToAdmin(lang, subject, body, appId);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('Error when sending mail to admin', e);
    }

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};

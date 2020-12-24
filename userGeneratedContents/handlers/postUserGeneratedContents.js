import AVAILABLE_TYPES from '../userGeneratedContentsTypes.json';
import emailTemplate from '../lib/emailUgcNotifyTemplate';
import pathToCollection from '../../libs/collections/pathToCollection';
import postUserGeneratedContents from '../lib/postUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import sendEmailToAdmin from '../lib/sendEmailToAdmin';
import { getUserLanguage } from '../../libs/intl/intl';

export default async (event) => {
  const {
    authorizer,
    resourcePath,
  } = event.requestContext;

  const {
    appId,
    principalId: userId,
  } = authorizer;

  /* Get collection from resource path */
  let parentCollection = pathToCollection(resourcePath);

  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const bodyParsed = JSON.parse(event.body);
    const {
      parentId,
      type,
      data,
    } = bodyParsed;

    if (!parentId) {
      parentCollection = '';
    }

    /* If unspecified, use the same as parent for the rootParent */
    const rootParentId = bodyParsed.rootParentId || parentId;
    const rootParentCollection = bodyParsed.rootParentCollection || parentCollection;

    if (!type || !data) {
      throw new Error('missing_arguments');
    }

    [
      appId,
      parentId,
      parentCollection,
      rootParentId,
      rootParentCollection,
      userId,
      type,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('wrong_argument_type');
      }
    });

    if (typeof AVAILABLE_TYPES[type] === 'undefined') {
      throw new Error('wrong_type_value');
    }

    switch (type) {
      case AVAILABLE_TYPES.article:
        if (
          !data.title ||
          !data.content ||
          ((!data.pictures ||
          !data.pictures.length) &&
          (!data.videos ||
          !data.videos.length))
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
      default: break;
    }

    const result = await postUserGeneratedContents(
      appId,
      parentId,
      parentCollection,
      rootParentId || parentId,
      rootParentCollection || parentCollection,
      userId,
      type,
      data,
    );

    const lang = getUserLanguage(event.headers);

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
        result._id,
        lang,
      );
      await sendEmailToAdmin(lang, subject, body, appId);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('Error when sending mail to admin', e);
    }
    return response({ code: 200, body: result });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

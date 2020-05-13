import patchUserGeneratedContents from '../lib/patchUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import checkOwner from '../../libs/perms/checkOwner';
import sendEmailToAdmin from '../lib/sendEmailToAdmin';
import emailTemplate from '../lib/emailUgcNotifyTemplate';

const {
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

export default async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const userId = event.requestContext.authorizer.principalId;
    const userGeneratedContentsId = event.pathParameters.id;
    const bodyParsed = JSON.parse(event.body);
    const {
      data,
    } = bodyParsed;

    if (!data) {
      throw new Error('Missing arguments');
    }

    [
      data,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('Wrong argument type');
      }
    });

    const checkResults = await checkOwner(appId, userGeneratedContentsId, COLL_USER_GENERATED_CONTENTS, 'userId', userId);
    if (checkResults !== true) {
      return response(checkResults);
    }

    const results = await patchUserGeneratedContents(
      appId,
      userId,
      userGeneratedContentsId,
      data,
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
        { contentId: userGeneratedContentsId, data },
        { isEdition: true },
      );
      await sendEmailToAdmin(subject, body, appId);
    } catch (e) {
      console.log('Error when sending mail to admin', e);
    }

    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

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

    const { subject, body } = await emailTemplate(
      userId,
      appId,
      { contentId: userGeneratedContentsId, data },
      { isEdition: true },
    );
    await sendEmailToAdmin(subject, body, appId);

    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

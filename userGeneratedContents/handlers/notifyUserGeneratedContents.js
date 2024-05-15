/* eslint-disable import/no-relative-packages */
import notifyUserGeneratedContents from '../lib/notifyUserGeneratedContents';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const userGeneratedContentsId = event.pathParameters.id;
    const bodyParsed = JSON.parse(event.body);
    const { content = null, notifyAt = null, title = null } = bodyParsed;

    await checkPermsForApp(userId, appId, ['admin']);

    await notifyUserGeneratedContents(appId, userGeneratedContentsId, {
      title,
      content,
      notifyAt,
    });

    return response({ code: 200, body: { scheduled: true } });
  } catch (exception) {
    return handleException(exception);
  }
};

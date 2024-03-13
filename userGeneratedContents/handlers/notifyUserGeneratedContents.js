/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import notifyUserGeneratedContents from '../lib/notifyUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const userGeneratedContentsId = event.pathParameters.id;
    const bodyParsed = JSON.parse(event.body);
    const { content = null, notifyAt = null, title = null } = bodyParsed;

    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('forbidden_user');
    }

    await notifyUserGeneratedContents(appId, userGeneratedContentsId, {
      title,
      content,
      notifyAt,
    });

    return response({ code: 200, body: { scheduled: true } });
  } catch (e) {
    return response(errorMessage(e));
  }
};

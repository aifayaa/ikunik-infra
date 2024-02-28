/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import notifyUserGeneratedContents from '../lib/notifyUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

/** @TODO fix permissions globally, do something, please... */
const permKey = 'userGeneratedContents_all';

export default async (event) => {
  const perms = JSON.parse(event.requestContext.authorizer.perms);

  try {
    const { appId } = event.requestContext.authorizer;
    const userGeneratedContentsId = event.pathParameters.id;
    const bodyParsed = JSON.parse(event.body);
    const { content = null, notifyAt = null, title = null } = bodyParsed;

    if (!checkPerms(permKey, perms)) {
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

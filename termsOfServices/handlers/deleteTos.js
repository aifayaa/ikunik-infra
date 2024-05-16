/* eslint-disable import/no-relative-packages */
import deleteTos from '../lib/deleteTos';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const tosId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const ok = await deleteTos(appId, tosId);
    return response({ code: 200, body: { ok } });
  } catch (exception) {
    return handleException(exception);
  }
};

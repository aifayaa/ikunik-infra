/* eslint-disable import/no-relative-packages */
import deleteUser from '../lib/deleteUser';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;

  try {
    const allowed = await checkPermsForApp(userId, appId, ['admin'], {
      dontThrow: true,
    });

    if (userId !== urlId && !allowed) {
      return response({ code: 403, message: 'access_forbidden' });
    }

    const deleteRefs = await deleteUser(urlId, appId);
    return response({ code: 200, body: deleteRefs });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

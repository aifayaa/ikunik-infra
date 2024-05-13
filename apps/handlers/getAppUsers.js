/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import getAppUsers from '../lib/getAppUsers';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;

  try {
    if (!userId) throw new Error('no_user_found');

    // Check right for userId to appId
    const allowed = await checkPermsForApp(userId, appId, 'viewer');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const users = await getAppUsers(appId);

    return response({ code: 200, body: users });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};

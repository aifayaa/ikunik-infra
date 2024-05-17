/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import delUserAppPerms from '../lib/delUserAppPerms';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: appId, userId: targetUserId } = event.pathParameters;
  try {
    if (!appId) throw new Error('org_not_found');

    // Check right for userId to appId
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) throw new Error('access_forbidden');

    const res = await delUserAppPerms(targetUserId, appId);

    return response({ code: 200, body: res });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};

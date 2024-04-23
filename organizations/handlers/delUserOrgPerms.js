/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import delUserPerms from '../lib/delUserOrgPerms';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: orgId, userId: targetId } = event.pathParameters;
  try {
    if (!userId) throw new Error('user_not_found');
    if (!targetId) throw new Error('target_user_not_found');
    if (!orgId) throw new Error('org_not_found');
    const allowed = await checkPermsForOrganization(userId, orgId, 'admin');
    if (!allowed) throw new Error('access_forbidden');

    const res = await delUserPerms(targetId, orgId);

    return response({ code: 200, body: res });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};

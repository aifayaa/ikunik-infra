/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import changeUserOrgPerms from '../lib/changeUserOrgPerms';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: orgId, userId: targetId } = event.pathParameters;
  try {
    if (!orgId) {
      throw new Error('organization_not_found');
    }
    if (!targetId) {
      throw new Error('target_user_not_found');
    }

    const bodyParsed = JSON.parse(event.body);
    if (!bodyParsed) {
      throw new Error('new_perm_missing');
    }

    const allowed = await checkPermsForOrganization(userId, orgId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const res = await changeUserOrgPerms(targetId, orgId, bodyParsed);

    return await response({ code: 200, body: res });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};

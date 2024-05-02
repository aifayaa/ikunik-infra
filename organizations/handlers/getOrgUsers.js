/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import getUserOrgPerms from '../lib/getUserOrgPerms';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: orgId } = event.pathParameters;

  try {
    const allowed = await checkPermsForOrganization(userId, orgId, 'member');
    if (!allowed) throw new Error('access_forbidden');

    const res = await getUserOrgPerms(orgId);

    return response({ code: 200, body: res });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};

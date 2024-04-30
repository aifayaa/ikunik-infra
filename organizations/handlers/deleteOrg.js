/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import deleteOrg from '../lib/deleteOrg';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;

  try {
    if (!userId) {
      throw new Error('user_not_found');
    }

    const allowed = await checkPermsForOrganization(userId, orgId, 'owner');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    await deleteOrg(userId, orgId);
    return response({ code: 200, body: { deleted: true } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};

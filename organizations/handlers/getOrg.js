/* eslint-disable import/no-relative-packages */
import { returnedFieldsFilter } from '../lib/fieldsChecks';
import getOrg from '../lib/getOrg';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;

  try {
    const allowed = await checkPermsForOrganization(userId, orgId, 'member');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const org = await getOrg(orgId);
    if (!org) {
      throw new Error('org_not_found');
    }
    return response({ code: 200, body: returnedFieldsFilter(org) });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};

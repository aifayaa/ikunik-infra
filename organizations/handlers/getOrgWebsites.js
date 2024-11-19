/* eslint-disable import/no-relative-packages */
import getOrgWebsites from '../lib/getOrgWebsites';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;

  try {
    await checkPermsForOrganization(userId, orgId, ['member']);

    const websites = await getOrgWebsites(orgId);
    return response({ code: 200, body: websites });
  } catch (e) {
    return response(errorMessage(e));
  }
};

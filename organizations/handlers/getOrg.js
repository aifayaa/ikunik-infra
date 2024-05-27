/* eslint-disable import/no-relative-packages */
import getOrg from '../lib/getOrg';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor.ts';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;

  try {
    const orgPermissionLevel = 'member';
    await checkPermsForOrganization(userId, orgId, orgPermissionLevel);

    const org = await getOrg(orgId);

    return response({ code: 200, body: formatResponseBody({ data: org }) });
  } catch (exception) {
    return handleException(exception);
  }
};

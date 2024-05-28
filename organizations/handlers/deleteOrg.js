/* eslint-disable import/no-relative-packages */
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor.ts';
import deleteOrg from '../lib/deleteOrg.ts';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;

  try {
    const orgPermissionLevel = ['owner'];
    await checkPermsForOrganization(userId, orgId, orgPermissionLevel);

    const res = await deleteOrg(orgId);

    return response({ code: 200, body: formatResponseBody({ data: res }) });
  } catch (exception) {
    return handleException(exception);
  }
};

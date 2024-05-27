/* eslint-disable import/no-relative-packages */
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor.ts';
import delUserOrgPerms from '../lib/delUserOrgPerms';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: orgId, userId: targetUserId } = event.pathParameters;

  try {
    const orgPermissionLevel = 'admin';
    await checkPermsForOrganization(userId, orgId, orgPermissionLevel);

    await delUserOrgPerms(targetUserId, orgId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: {},
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

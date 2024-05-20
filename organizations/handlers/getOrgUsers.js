/* eslint-disable import/no-relative-packages */
import {
  ERROR_TYPE_ACCESS,
  ORGANIZATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import getUserOrgPerms from '../lib/getUserOrgPerms';
import filterUserPrivateFields from '../../users/lib/usersUtils';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: orgId } = event.pathParameters;

  try {
    const orgPermissionLevel = 'member';
    const allowedOrg = await checkPermsForOrganization(
      userId,
      orgId,
      orgPermissionLevel
    );
    if (!allowedOrg) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_ACCESS,
            code: ORGANIZATION_PERMISSION_CODE,
            message: `User '${userId}' is not at least '${orgPermissionLevel}' on organization '${orgId}'`,
            details: {
              userId,
              orgId,
              orgPermissionLevel,
            },
          },
        ],
      });
      return response({ code: 200, body: errorBody });
    }

    const users = await getUserOrgPerms(orgId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          items: users.map((user) => filterUserPrivateFields(user)),
          totalCount: users.length,
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

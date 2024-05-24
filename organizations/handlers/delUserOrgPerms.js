/* eslint-disable import/no-relative-packages */
import {
  ERROR_TYPE_ACCESS,
  ORGANIZATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes';
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
    const allowed = await checkPermsForOrganization(
      userId,
      orgId,
      orgPermissionLevel
    );
    if (!allowed) {
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

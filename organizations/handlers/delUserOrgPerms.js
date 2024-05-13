/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_ACCESS,
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ORGANIZATION_PERMISSION_CODE,
  UNMANAGED_EXCEPTION_CODE,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import response from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
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

    const user = await delUserOrgPerms(targetUserId, orgId);

    return response({ code: 200, body: formatResponseBody({ data: user }) });
  } catch (exception) {
    if (exception instanceof CrowdaaError) {
      const { type, code, message } = exception;
      const errorBody = formatResponseBody({
        errors: [
          {
            type,
            code,
            message,
            details: exception.stack,
          },
        ],
      });
      return response({ code: 200, body: errorBody });
    }

    const errorBody = formatResponseBody({
      errors: [
        {
          type: ERROR_TYPE_INTERNAL_EXCEPTION,
          code: UNMANAGED_EXCEPTION_CODE,
          message: exception.message,
          details: exception,
        },
      ],
    });

    return response({ code: 200, body: errorBody });
  }
};

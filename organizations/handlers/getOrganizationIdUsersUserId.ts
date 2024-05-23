/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';

import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.js';
import {
  ERROR_TYPE_ACCESS,
  ORGANIZATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes.js';
import { filterUserPrivateFields, getUser } from '../../users/lib/usersUtils';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: sourceUserId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { id: orgId, userId: targetUserId } = event.pathParameters as {
    id: string;
    userId: string;
  };

  try {
    const orgPermissionLevel = 'member';
    const allowedOrgSourceUser = await checkPermsForOrganization(
      sourceUserId,
      orgId,
      orgPermissionLevel
    );
    if (!allowedOrgSourceUser) {
      throw new CrowdaaError(
        ERROR_TYPE_ACCESS,
        ORGANIZATION_PERMISSION_CODE,
        `User '${sourceUserId}' is not at least '${orgPermissionLevel}' on organization '${orgId}'`,
        {
          details: {
            userId: sourceUserId,
            orgId,
            orgPermissionLevel,
          },
        }
      );
    }

    const allowedOrgTargetUser = await checkPermsForOrganization(
      targetUserId,
      orgId,
      orgPermissionLevel
    );
    if (!allowedOrgTargetUser) {
      throw new CrowdaaError(
        ERROR_TYPE_ACCESS,
        ORGANIZATION_PERMISSION_CODE,
        `User '${targetUserId}' is not at least '${orgPermissionLevel}' on organization '${orgId}'`,
        {
          details: {
            userId: targetUserId,
            orgId,
            orgPermissionLevel,
          },
        }
      );
    }

    const user = await getUser(targetUserId);

    return response({
      code: 200,
      body: formatResponseBody({ data: filterUserPrivateFields(user) }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

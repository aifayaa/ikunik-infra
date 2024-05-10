/* eslint-disable import/no-relative-packages */
import {
  ERROR_TYPE_ACCESS,
  ORGANIZATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import deleteOrg from '../lib/deleteOrg';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;

  try {
    const orgPermissionLevel = 'owner';
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

    const res = await deleteOrg(userId, orgId);
    return response({ code: 200, body: formatResponseBody({ data: res }) });
  } catch (exception) {
    return handleException(exception);
  }
};

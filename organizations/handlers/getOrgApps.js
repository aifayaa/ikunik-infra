/* eslint-disable import/no-relative-packages */
import getOrgApps from '../lib/getOrgApps';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor.ts';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import {
  ERROR_TYPE_ACCESS,
  ORGANIZATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;

  try {
    const orgPermissionLevel = 'member';
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

    const apps = await getOrgApps(orgId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: { items: apps, totalCount: apps.length },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

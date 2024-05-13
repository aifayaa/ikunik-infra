/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_ACCESS,
  ORGANIZATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { filterUserPrivateFields } from '../lib/appsUtils';
import getAppUsers from '../lib/getAppUsers';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;

  try {
    const appPermissionLevel = 'viewer';
    const allowed = await checkPermsForApp(userId, appId, appPermissionLevel);
    if (!allowed) {
      throw new CrowdaaError(
        ERROR_TYPE_ACCESS,
        ORGANIZATION_PERMISSION_CODE,
        `User '${userId}' is not at least '${appPermissionLevel}' on application '${appId}'`,
        {
          details: {
            userId,
            appId,
            appPermissionLevel,
          },
        }
      );
    }

    const users = await getAppUsers(appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          items: filterUserPrivateFields(users),
          totalCount: users.length,
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

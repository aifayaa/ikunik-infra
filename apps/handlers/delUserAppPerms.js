/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APPLICATION_PERMISSION_CODE,
  ERROR_TYPE_ACCESS,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForAppArray } from '../../libs/perms/checkPermsFor';
import { filterAppPrivateFields } from '../lib/appsUtils';
import delUserAppPerms from '../lib/delUserAppPerms';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: appId, userId: targetUserId } = event.pathParameters;

  try {
    const requestedPermissions = ['admin'];
    const allowed = await checkPermsForAppArray(userId, appId, [
      requestedPermissions,
    ]);
    if (!allowed) {
      throw new CrowdaaError(
        ERROR_TYPE_ACCESS,
        APPLICATION_PERMISSION_CODE,
        `User '${userId}' is not at least '${requestedPermissions.join(' or ')}' on application '${appId}'`,
        {
          details: {
            userId,
            appId,
            requestedPermissions,
          },
        }
      );
    }

    const app = await delUserAppPerms(targetUserId, appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          items: filterAppPrivateFields(app),
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

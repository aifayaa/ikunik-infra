/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_ACCESS,
  APPLICATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForAppArray } from '../../libs/perms/checkPermsFor';
import { filterUserPrivateFields } from '../lib/appsUtils';
import getAppUsers from '../lib/getAppUsers';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;

  try {
    const appViewerLevel = 'viewer';
    const appModeratorLevel = 'moderator';
    const appEditorLevel = 'editor';
    const allowed = await checkPermsForAppArray(userId, appId, [
      appViewerLevel,
      appModeratorLevel,
      appEditorLevel,
    ]);
    if (!allowed) {
      throw new CrowdaaError(
        ERROR_TYPE_ACCESS,
        APPLICATION_PERMISSION_CODE,
        `User '${userId}' is not at least '${appViewerLevel}' or '${appModeratorLevel}' or '${appEditorLevel}' on application '${appId}'`,
        {
          details: {
            userId,
            appId,
            appPermissionLevel: appViewerLevel,
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

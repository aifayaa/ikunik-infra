/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import { AppsPermType } from '../../libs/perms/permEntities';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import postAppsIdActivateWPPlaylists from '../lib/postAppsIdActivateWPPlaylists';
import { filterAppPrivateFields } from '../lib/appsUtils';
import { checkAppPlanForLimitAccess } from 'appsFeaturePlans/lib/checkAppPlanForLimits';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId, superAdmin } = event.requestContext
    .authorizer as {
    principalId: string;
    superAdmin?: boolean;
  };
  const { id: appId } = event.pathParameters as {
    id: string;
  };

  try {
    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'playlists');

      if (!allowed) {
        throw new Error('app_limits_exceeded');
      }
    }

    const requestedPermissions = [
      'viewer',
      'moderator',
      'editor',
    ] as AppsPermType[];
    await checkPermsForApp(userId, appId, requestedPermissions);

    const app = await postAppsIdActivateWPPlaylists(appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: filterAppPrivateFields(app),
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

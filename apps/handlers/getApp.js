/* eslint-disable import/no-relative-packages */
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import {
  filterAppPrivateFields,
  getApp,
  getAppLockedFields,
} from '../lib/appsUtils.ts';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';

export default async (event) => {
  const { principalId: userId, superAdmin } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const app = await getApp(appId);

    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'playlists');

      if (!allowed) {
        if (app && app.settings) {
          delete app.settings.playlistManagementUrl;
        }
      }
    }

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          ...filterAppPrivateFields(app),
          locked: getAppLockedFields(app),
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

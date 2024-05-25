/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  APP_ALREADY_BUILD_CODE,
  ERROR_TYPE_INTERNAL_EXCEPTION,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import delApp from '../lib/delApp';
import { getApp, isAppAlreadyBuild } from '../lib/appsUtils';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['owner']);

    const app = await getApp(appId);
    if (isAppAlreadyBuild(app)) {
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        APP_ALREADY_BUILD_CODE,
        `Application '${appId}' cannot be deleted because already built`,
        {
          details: {
            userId,
            appId,
          },
        }
      );
    }

    const res = await delApp(userId, appId);

    return response({
      code: 200,
      body: formatResponseBody({ data: res }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

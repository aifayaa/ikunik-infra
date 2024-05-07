/* eslint-disable import/no-relative-packages */
import { CrowdaaException } from '../../libs/httpResponses/crowdaaException';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  UNMANAGED_EXCEPTION_CODE,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import startBuilds from '../lib/startBuilds';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: appId } = event.pathParameters;

  try {
    if (!appId) throw new Error('app_not_found');
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) throw new Error('access_forbidden');

    const { platforms } = event.body ? JSON.parse(event.body) : {};

    const startBuildResult = await startBuilds(appId, { platforms });

    return response({
      code: 200,
      body: formatResponseBody({
        data: startBuildResult,
      }),
    });
  } catch (exception) {
    if (exception instanceof CrowdaaException) {
      return response({
        code: exception.httpCode,
        body: formatResponseBody({
          errors: [
            {
              type: exception.type,
              code: exception.code,
              message: exception.message,
              details: exception,
            },
          ],
        }),
      });
    }

    return response({
      code: 200,
      body: formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_INTERNAL_EXCEPTION,
            code: UNMANAGED_EXCEPTION_CODE,
            message: exception.message,
            details: exception,
          },
        ],
      }),
    });
  }
};

/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import getBuildsStatus from '../lib/getBuildsStatus';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  UNMANAGED_EXCEPTION_CODE,
} from '../../libs/httpResponses/errorCodes';
import { CrowdaaException } from '../../libs/httpResponses/crowdaaException';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: appId, platform } = event.pathParameters;
  try {
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const params = event.queryStringParameters || {};

    const boolParams = Object.keys(params).reduce((acc, key) => {
      acc[key] = params[key] === 'true';
      return acc;
    }, {});

    const buildsStatus = await getBuildsStatus(appId, platform, boolParams);

    return response({
      code: 200,
      body: formatResponseBody({
        data: buildsStatus,
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

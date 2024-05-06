/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import getApp from '../lib/getApp';
import { CrowdaaException } from '../../libs/httpResponses/crowdaaException';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  UNMANAGED_EXCEPTION,
} from '../../libs/httpResponses/errorCodes';
import { filterAppPrivateFields, getAppLockedFields } from '../lib/appsUtils';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;
  try {
    if (!userId) throw new Error('no_user_found');

    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const app = await getApp(appId);

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
            code: UNMANAGED_EXCEPTION,
            message: exception.message,
            details: exception,
          },
        ],
      }),
    });
  }
};

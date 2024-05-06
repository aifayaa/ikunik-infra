/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { modifyAppSchema } from '../validators/modifyAppSchema.schema';
import modifyApp from '../lib/modifyApp';
import { CrowdaaException } from '../../libs/httpResponses/crowdaaException';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  UNMANAGED_EXCEPTION,
} from '../../libs/httpResponses/errorCodes';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;
  try {
    if (!userId) throw new Error('no_user_found');

    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    // Validate the body of the request
    const update = JSON.parse(event.body);

    try {
      modifyAppSchema.parse(update);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const body = formatResponseBody({ errors });
      return response({ code: 200, body });
    }

    const app = await modifyApp(appId, update);

    return response({
      code: 200,
      body: formatResponseBody({
        data: { app },
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

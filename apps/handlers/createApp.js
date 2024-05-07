/* eslint-disable import/no-relative-packages */
import createApp from '../lib/createApp';
import response from '../../libs/httpResponses/response';
import { CrowdaaException } from '../../libs/httpResponses/crowdaaException';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  UNMANAGED_EXCEPTION_CODE,
} from '../../libs/httpResponses/errorCodes';
import { filterAppPrivateFields } from '../lib/appsUtils';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;

  try {
    if (!userId) {
      throw new Error('malformed_request');
    }

    if (!event.body) {
      throw new Error('malformed_request');
    }

    const { name, protocol } = JSON.parse(event.body);

    const app = await createApp(name, userId, { protocol });

    return response({
      code: 200,
      body: formatResponseBody({
        data: filterAppPrivateFields(app),
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

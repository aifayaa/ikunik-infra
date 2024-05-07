/* eslint-disable import/no-relative-packages */
import { CrowdaaException } from '../../libs/httpResponses/crowdaaException';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  UNMANAGED_EXCEPTION,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import response from '../../libs/httpResponses/response';
import getUserApps from '../lib/getUserApps';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  try {
    if (!userId) throw new Error('no_user_found');

    const appsList = await getUserApps(userId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: { items: appsList, totalCount: appsList.length },
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

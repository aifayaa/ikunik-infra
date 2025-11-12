/* eslint-disable import/no-relative-packages */
import notificationClicked from '../lib/notificationClicked';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { z } from 'zod';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  INVALID_INPUT_FORMAT_CODE,
} from '@libs/httpResponses/errorCodes';

function unknownToInt(val: unknown) {
  if (typeof val === 'string') {
    const int = parseInt(val, 10);
    if (Number.isNaN(int)) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_INPUT_FORMAT_CODE,
        'Invalid format for integer input'
      );
    }

    return int;
  }

  return val;
}

const querySchema = z.object({
  nextToken: z
    .string({
      invalid_type_error: 'nextToken must be a string',
    })
    .optional(),
  limit: z
    .preprocess(unknownToInt, z.number().int().min(1).max(100).optional())
    .default(30),
});

const pathSchema = z.object({
  id: z
    .string({
      invalid_type_error: 'id must be a string',
    })
    .min(1),
});

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId, appId } = event.requestContext.authorizer as {
    principalId: string | undefined;
    appId: string;
    superAdmin: boolean;
  };

  try {
    const { id: notificationId } = pathSchema.parse(event.pathParameters || {});

    const session = await notificationClicked(
      userId || null,
      appId,
      notificationId
    );
    return response({
      code: 200,
      body: formatResponseBody({
        data: session,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

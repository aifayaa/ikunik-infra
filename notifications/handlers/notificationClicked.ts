/* eslint-disable import/no-relative-packages */
import notificationClicked from '../lib/notificationClicked';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { z } from 'zod';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes';

const pathSchema = z.object({
  id: z
    .string({
      invalid_type_error: 'blastQueueId must be a string',
    })
    .min(1),
});

const bodySchema = z.object({
  notificationId: z
    .string({
      invalid_type_error: 'notificationId must be a string',
    })
    .min(1)
    .optional(),
  deviceId: z
    .string({
      invalid_type_error: 'deviceId must be a string',
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
    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    // Validate the body of the request
    const body = JSON.parse(event.body);

    const { notificationId, deviceId } = bodySchema.parse(body);

    const { id: blastQueueId } = pathSchema.parse(event.pathParameters || {});

    const result = await notificationClicked(
      userId || null,
      appId,
      deviceId,
      blastQueueId,
      notificationId
    );
    return response({
      code: 200,
      body: formatResponseBody({
        data: result,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

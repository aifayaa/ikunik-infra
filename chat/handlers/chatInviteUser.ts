import chatInviteUser from '../lib/chatInviteUser';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { z } from 'zod';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';

const bodySchema = z
  .object({
    channelId: z
      .string({
        required_error: 'channelId is required',
        invalid_type_error: 'channelId must be a string',
      })
      .trim(),
    userId: z
      .string({
        required_error: 'userId is required',
        invalid_type_error: 'userId must be a string',
      })
      .trim(),
  })
  .required();

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: fromUserId, appId } = event.requestContext
    .authorizer as {
    principalId: string;
    appId: string;
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

    const { userId: toUserId, channelId } = bodySchema.parse(body);

    const { invited } = await chatInviteUser(appId, {
      channelId,
      fromUserId,
      toUserId,
    });

    return response({
      code: 200,
      body: formatResponseBody({
        data: { invited },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

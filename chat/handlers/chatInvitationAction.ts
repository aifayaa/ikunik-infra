import chatInvitationAction from '../lib/chatInvitationAction';
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
    action: z.enum(['accept', 'reject']),
  })
  .required();

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId, appId } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
  };
  const { id: invitationId } = event.pathParameters as { id: string };

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

    const { action } = bodySchema.parse(body);

    await chatInvitationAction(appId, userId, {
      action,
      invitationId,
    });

    return response({
      code: 200,
      body: formatResponseBody({
        data: { ok: true },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

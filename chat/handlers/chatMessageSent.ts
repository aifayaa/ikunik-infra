/* eslint-disable import/no-relative-packages */
import chatMessageSent from '../lib/chatMessageSent';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { getUserLanguage } from '@libs/intl/intl';

const bodySchema = z
  .object({
    message: z.string({
      required_error: 'message is required',
      invalid_type_error: 'message must be a string',
    }),
    haveAttachments: z.boolean({
      required_error: 'haveAttachments is required',
    }),
  })
  .required();

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
    superAdmin: boolean;
  };

  const { id: channelId } = event.pathParameters as { id: string };

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

    const { message, haveAttachments } = bodySchema.parse(body);

    const lang = getUserLanguage(event.headers);

    await chatMessageSent(userId, appId, {
      channelId,
      haveAttachments,
      message,
      lang,
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

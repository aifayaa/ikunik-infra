import sendForumTopicReply from '../lib/sendForumTopicReply';
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
    content: z
      .string({
        required_error: 'content is required',
        invalid_type_error: 'content must be a string',
      })
      .trim()
      .min(1, 'content must be at least 1 character'),
  })
  .strict()
  .required();

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId, appId } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
  };

  const { topicId } = event.pathParameters as {
    topicId: string;
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

    const newMessageData = bodySchema.parse(body);

    const dbMessage = await sendForumTopicReply(
      appId,
      userId,
      topicId,
      newMessageData
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: dbMessage,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

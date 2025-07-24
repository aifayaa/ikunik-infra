import createForumCategoryTopic from '../lib/createForumCategoryTopic';
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
    title: z
      .string({
        required_error: 'title is required',
        invalid_type_error: 'title must be a string',
      })
      .trim()
      .min(1, 'title must be at least 1 character'),
    content: z
      .string({
        required_error: 'content is required',
        invalid_type_error: 'content must be a string',
      })
      .trim()
      .min(1, 'content must be at least 1 character'),
    badges: z.array(
      z
        .string({
          invalid_type_error: 'badges must be a string',
        })
        .trim()
        .min(1, 'badges must be at least 1 character')
    ),
    badgesAllow: z.enum(['all', 'any']).default('any'),
  })
  .strict()
  .required();

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId, appId } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
  };

  const { categoryId } = event.pathParameters as { categoryId: string };

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

    const newTopicData = bodySchema.parse(body);

    const dbTopic = await createForumCategoryTopic(
      appId,
      userId,
      categoryId,
      newTopicData
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: dbTopic,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

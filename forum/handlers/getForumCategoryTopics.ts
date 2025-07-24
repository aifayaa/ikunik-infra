import getForumCategoryTopics from '../lib/getForumCategoryTopics';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { z } from 'zod';

const urlSchema = z
  .object({
    limit: z
      .string()
      .trim()
      .optional()
      .default('25')
      .transform((x) => (x ? parseInt(x, 10) || 25 : 25)),
    start: z
      .string()
      .trim()
      .optional()
      .default('0')
      .transform((x) => (x ? parseInt(x, 10) || 0 : 0)),
    sortBy: z
      .enum(['recent', 'popular', 'solved'])
      .optional()
      .default('recent'),
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
    let { start, limit, sortBy } = urlSchema.parse(
      event.queryStringParameters || {}
    );

    const { items, totalCount } = await getForumCategoryTopics(
      appId,
      userId,
      categoryId,
      {
        start,
        limit,
        sortBy,
      }
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: { items, totalCount },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

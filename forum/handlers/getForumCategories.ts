import getForumCategories from '../lib/getForumCategories';
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
  })
  .strict()
  .required();

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId, appId } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
  };

  try {
    let { start, limit } = urlSchema.parse(event.queryStringParameters || {});

    const { items, totalCount } = await getForumCategories(appId, {
      start,
      limit,
    });

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

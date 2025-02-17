/* eslint-disable import/no-relative-packages */
import response, { handleException } from '@libs/httpResponses/response';
import { checkPermsForApp } from '@libs/perms/checkPermsFor';
import { getSummary } from '../lib/getSummary';
import { APIGatewayEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { z } from 'zod';

function parseDate(x: string | undefined) {
  if (!x) {
    return null;
  }

  const date = new Date(x);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

const queryStringSchema = z.object({
  from: z.string().optional().transform(parseDate),
  to: z.string().optional().transform(parseDate),
  totalReadingTime: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((x) => x === 'true'),
  timePerArticle: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((x) => x === 'true'),
});

export default async (event: APIGatewayEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };

  try {
    const {
      from: fromDate,
      to: toDate,
      totalReadingTime: getTotalReadingTime,
      timePerArticle: getTimePerArticle,
    } = queryStringSchema.parse(event.queryStringParameters || {});

    await checkPermsForApp(userId, appId, ['admin']);

    const results = await getSummary(appId, {
      fromDate,
      toDate,
      getTotalReadingTime,
      getTimePerArticle,
    });
    return response({
      code: 200,
      body: formatResponseBody({
        data: results,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response, { handleException } from '../../libs/httpResponses/response';
import getLiveStreams from '../lib/getLiveStreams';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { z } from 'zod';

function stringToBool3(x: string | undefined) {
  if (x === 'true') return true;
  if (x === 'false') return false;
  return null;
}
function stringToBool2(x: string | undefined) {
  if (x === 'true') return true;
  return null;
}

const querySchema = z.object({
  id: z.string().optional(),
  start: z.string().optional(),
  limit: z.string().optional(),
  active: z.string().optional().transform(stringToBool3),
  users: z.string().optional().transform(stringToBool2),
});

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };

  try {
    const { id, start, limit, active, users } = querySchema.parse(
      event.queryStringParameters
    );

    const { list, count } = await getLiveStreams(appId, userId, {
      id,
      start,
      limit,
      active,
      users,
    });
    return response({
      code: 200,
      body: formatResponseBody({
        data: { list, count },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

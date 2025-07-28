/* eslint-disable import/no-relative-packages */
import getPublicProfile from '../lib/getPublicProfile';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  const { appId } = event.requestContext.authorizer as { appId: string };
  const { id: urlId } = event.pathParameters as { id: string };

  const { forumStats } = event.queryStringParameters as {
    forumStats?: 'true' | 'false';
  };

  try {
    const dbUser = await getPublicProfile(urlId, appId, {
      forumStats: forumStats === 'true',
    });

    return response({
      code: 200,
      body: formatResponseBody({
        data: dbUser,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

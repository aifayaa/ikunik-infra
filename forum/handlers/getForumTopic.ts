import getForumTopic from '../lib/getForumTopic';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId, appId } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
  };

  const { topicId } = event.pathParameters as { topicId: string };

  try {
    const topic = await getForumTopic(appId, topicId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: topic,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

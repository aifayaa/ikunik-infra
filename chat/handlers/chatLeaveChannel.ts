import chatLeaveChannel from '../lib/chatLeaveChannel';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId, appId } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
  };

  const { id: channelId } = event.pathParameters as { id: string };

  try {
    await chatLeaveChannel(appId, userId, channelId);

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

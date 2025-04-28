/* eslint-disable import/no-relative-packages */
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody.js';
import response, {
  handleException,
} from '../../libs/httpResponses/response.js';
import watchLiveStream from '../lib/watchLiveStream.js';
import { APIGatewayProxyEvent } from 'aws-lambda';

export default async (event: APIGatewayProxyEvent) => {
  try {
    const { appId } = event.requestContext.authorizer as {
      appId: string;
    };
    const { id: liveStreamId } = event.pathParameters as { id: string };
    const { deviceId } = event.queryStringParameters || {};

    if (!deviceId) {
      throw new Error('missing_argument');
    }

    const results = await watchLiveStream(appId, liveStreamId, deviceId);

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

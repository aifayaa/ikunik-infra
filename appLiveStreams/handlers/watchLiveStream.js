/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import watchLiveStream from '../lib/watchLiveStream';

export default async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const { id: liveStreamId } = event.pathParameters;
    const { deviceId } = event.queryStringParameters || {};

    if (!deviceId) {
      throw new Error('missing_argument');
    }

    const results = await watchLiveStream(appId, liveStreamId, deviceId);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};

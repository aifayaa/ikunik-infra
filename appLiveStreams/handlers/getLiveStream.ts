/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';

import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getLiveStream from '../lib/getLiveStream';
import { filterAppLiveStreamOutput } from '../lib/utils';

export default async (event: APIGatewayProxyEvent) => {
  const { appId } = event.requestContext.authorizer as {
    appId: string;
  };
  const { id: liveStreamId } = event.pathParameters as {
    id: string;
  };

  try {
    const liveStream = await getLiveStream(liveStreamId, appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: filterAppLiveStreamOutput(liveStream),
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

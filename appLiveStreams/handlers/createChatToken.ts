/* eslint-disable import/no-relative-packages */
import response, {
  handleException,
} from '../../libs/httpResponses/response.js';
import { createChatToken } from '../lib/createChatToken';
import { checkFeaturePermsForApp } from '../../libs/perms/checkPermsFor.js';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody.js';

export default async (event: APIGatewayProxyEvent) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer as {
      appId: string;
      principalId: string;
    };
    const { id: liveStreamId } = event.pathParameters as {
      id: string;
    };

    const isAdmin = await checkFeaturePermsForApp(
      userId,
      appId,
      ['appLiveStreaming'],
      { dontThrow: true }
    );

    const results = await createChatToken(liveStreamId, {
      appId,
      userId,
      isAdmin,
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

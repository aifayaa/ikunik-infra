/* eslint-disable import/no-relative-packages */
import response, { handleException } from '@libs/httpResponses/response';
import { checkPermsForApp } from '@libs/perms/checkPermsFor';
import { getSummary } from '../lib/getSummary';
import { APIGatewayEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const results = await getSummary(appId);
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

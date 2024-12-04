/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { checkPermsForApp } from '@libs/perms/checkPermsFor';
import leaderboardWpSetup from 'providers/lib/leaderboardWpSetup';
import { filterAppPrivateFields } from '@apps/lib/appsUtils';

export default async (event: APIGatewayProxyEvent) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer as {
      appId: string;
      principalId: string;
    };
    await checkPermsForApp(userId, appId, ['admin']);

    const result = await leaderboardWpSetup(userId, appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: filterAppPrivateFields(result),
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

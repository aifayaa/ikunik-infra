/* eslint-disable import/no-relative-packages */
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import downloadScreenshots from '../lib/downloadScreenshots';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

/**
 * Generate a temporary URL to download bundle files.
 */
export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { id: appId } = event.pathParameters as {
    id: string;
  };

  try {
    await checkPermsForApp(userId, appId, ['viewer']);

    const validityDuration = 3600;
    const url = await downloadScreenshots(appId, validityDuration);

    const now = Date.now();
    const timestampExpiration = new Date(now + 3600 * 1000);

    return response({
      code: 200,
      body: formatResponseBody({
        data: url ? { url, expiresAt: timestampExpiration.toISOString() } : {},
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

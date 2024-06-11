/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';

import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import delUserAppPerms from '../lib/delUserAppPerms';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { id: appId, userId: targetUserId } = event.pathParameters as {
    id: string;
    userId: string;
  };

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const deletedResources = await delUserAppPerms(targetUserId, appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: deletedResources,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

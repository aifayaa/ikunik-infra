/* eslint-disable import/no-relative-packages */
import deleteTos from '../lib/deleteTos';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };
  const { id: tosId } = event.pathParameters as {
    id: string;
  };

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const deletedResources = await deleteTos(appId, tosId);

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

/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import deleteBookable from '../lib/deleteBookable';
import { APIGatewayProxyEvent } from 'aws-lambda';

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };
  const { id: bookableId } = event.pathParameters as { id: string };

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const deletedBookable = await deleteBookable(bookableId, appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: deletedBookable,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

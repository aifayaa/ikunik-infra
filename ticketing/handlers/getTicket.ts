/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getTicket from '../lib/getTicket';

export default async (event: any) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const bookableId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const ticket = await getTicket(bookableId, appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: ticket,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

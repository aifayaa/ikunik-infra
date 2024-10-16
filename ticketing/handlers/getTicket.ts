/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getTicket from '../lib/getTicket';

export default async (event: any) => {
  const { appId } = event.requestContext.authorizer;
  const ticketId = event.pathParameters.id;

  try {
    const ticket = await getTicket(ticketId, appId);

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

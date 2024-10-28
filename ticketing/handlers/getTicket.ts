/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getTicket from '../lib/getTicket';
import { APIGatewayProxyEvent } from 'aws-lambda';

export default async (event: APIGatewayProxyEvent) => {
  const { appId } = event.requestContext.authorizer as { appId: string };
  const { id: ticketId } = event.pathParameters as { id: string };

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

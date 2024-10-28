/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { getBookableAndTickets } from 'ticketing/lib/getBookable';
import { APIGatewayProxyEvent } from 'aws-lambda';

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };
  const { id: bookableId } = event.pathParameters as { id: string };

  try {
    const bookable = await getBookableAndTickets(bookableId, appId, userId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: bookable,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

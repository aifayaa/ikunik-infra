/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getBookable from '../lib/getBookable';

export default async (event: any) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const bookableId = event.pathParameters.id;

  try {
    const bookable = await getBookable(bookableId, appId, userId);

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

/* eslint-disable import/no-relative-packages */
import getSessionToken, {
  SessionToken,
} from '../../lib/fontawesome/getSessionToken';
import response, {
  handleException,
} from '../../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '../../../libs/httpResponses/formatResponseBody';

export default async (_event: APIGatewayProxyEvent) => {
  try {
    const sessionToken = (await getSessionToken()) as SessionToken;

    return response({
      code: 200,
      body: formatResponseBody({
        data: sessionToken,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

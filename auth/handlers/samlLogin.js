/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import samlLoginUrl from '../lib/samlLogin';

export default async (event) => {
  try {
    const apiKey = event.pathParameters && event.pathParameters.key;

    const location = await samlLoginUrl(
      apiKey,
      event.queryStringParameters || {}
    );
    return response({
      code: 302,
      headers: {
        Location: location,
      },
      body: '',
    });
  } catch (e) {
    return response(errorMessage(e));
  }
};

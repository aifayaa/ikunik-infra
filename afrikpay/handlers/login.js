/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import login from '../lib/login';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }
    const { terminalId } = event.queryStringParameters || {};

    const { username, password } = JSON.parse(event.body);

    const { appId } = event.requestContext.authorizer;
    const result = await login(username, password, appId, { terminalId });

    return response({ code: 200, body: { status: 'success', data: result } });
  } catch (e) {
    return response(errorMessage(e));
  }
};

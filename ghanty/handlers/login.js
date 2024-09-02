/* eslint-disable import/no-relative-packages */
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import login from '../lib/login';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { username, password } = JSON.parse(event.body);

    const { appId } = event.requestContext.authorizer;
    const result = await login(username, password, appId);

    return response({ code: 200, body: { status: 'success', data: result } });
  } catch (exception) {
    return handleException(exception);
  }
};

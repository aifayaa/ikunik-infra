/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import { removeLoginToken } from '../lib/removeLoginToken';

export default async (event) => {
  try {
    const { headers } = event;
    if (!headers) throw new Error('missing_argument');

    // on android, case is not respected on headers
    const token = headers['X-Auth-Token'] || headers['x-auth-token'];
    const userId = headers['X-User-Id'] || headers['x-user-id'];

    [token, userId].forEach((item) => {
      if (!item) throw new Error('missing_argument');
      if (item && typeof item !== 'string') {
        throw new Error('wrong_argument_type');
      }
    });

    await removeLoginToken(userId, token);

    /* get User in db or create new one if not exists */
    return response({
      code: 200,
      body: { status: 'success', data: { message: "You've been logged out!" } },
    });
  } catch (e) {
    let code;
    switch (e.message) {
      case 'token_user_not_found':
        code = 404;
        break;
      case 'missing_argument':
      case 'wrong_argument_type':
        code = 400;
        break;
      default:
        code = 500;
    }
    return response({ code, message: e.message });
  }
};

import response from '../../libs/httpResponses/response';
import removeLoginToken from '../lib/removeLoginToken';

export default async (event) => {
  try {
    const token = event.headers['x-auth-token'];
    const userId = event.headers['x-user-id'];

    [
      token,
      userId,
    ].forEach((item) => {
      if (!item) throw new Error('missing_argument');
      if (item && typeof item !== 'string') {
        throw new Error('wrong_argument_type');
      }
    });

    await removeLoginToken(userId, token);

    /* get User in db or create new one if not exists */
    return response({ code: 200, body: { message: 'logout_success' } });
  } catch (e) {
    let code;
    switch (e.message) {
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

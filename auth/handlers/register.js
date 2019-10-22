import { typeCheck } from 'type-check';
import response from '../../libs/httpResponses/response';
import { register } from '../lib/register';

const PASSWORD_MIN_LENGTH = 6;

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { email, username, password } = JSON.parse(event.body);

    if (!typeCheck('[String]', [email, username, password])) throw new Error('wrong_argument_type');
    if (password.length < PASSWORD_MIN_LENGTH) throw new Error('invalid_password_length');

    const { appId } = event.requestContext.authorizer;
    const { userId } = await register(email, username, password, appId);

    return response({ code: 200, body: { status: 'success', data: { _id: userId } } });
  } catch (e) {
    let code;
    switch (e.message) {
      case 'app_not_found':
        code = 404;
        break;
      case 'missing_payload':
      case 'invalid_password_length':
        code = 400;
        break;
      default:
        code = 500;
    }
    return response({ code, message: e.message });
  }
};

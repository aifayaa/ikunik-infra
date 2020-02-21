import { typeCheck } from 'type-check';
import response from '../../libs/httpResponses/response';
import { login } from '../lib/login';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { email, username, password } = JSON.parse(event.body);

    if (!email && !username) {
      throw new Error('missing_arguments');
    }

    if (
      !typeCheck('[Maybe String]', [email, username]) || !typeCheck('String', password)
    ) throw new Error('wrong_argument_type');

    const { appId } = event.requestContext.authorizer;
    const result = await login(email, username, password, appId);

    return response({ code: 200, body: { status: 'success', data: result } });
  } catch (e) {
    let code;
    switch (e.message) {
      case 'app_not_found':
      case 'user_not_found':
        code = 404;
        break;
      case 'missing_payload':
      case 'missing_arguments':
      case 'wrong_argument_type':
        code = 400;
        break;
      default:
        code = 500;
    }
    return response({ code, message: e.message });
  }
};

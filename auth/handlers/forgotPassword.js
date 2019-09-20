import { typeCheck } from 'type-check';
import response from '../../libs/httpResponses/response';
import { forgotPassword } from '../lib/forgotPassword';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { email } = JSON.parse(event.body);
    const { appId } = event.requestContext.authorizer;

    if (typeCheck('String', email)) throw new Error('wrong_argument_type');

    await forgotPassword(email, appId);

    return response({ code: 200, body: { email, message: 'ok' } });
  } catch (e) {
    let code;
    switch (e.message) {
      case 'app_not_found':
      case 'email_not_found':
        code = 404;
        break;
      case 'wrong_argument_type':
      case 'missing_payload':
        code = 400;
        break;
      default:
        code = 500;
    }
    return response({ code, message: e.message });
  }
};

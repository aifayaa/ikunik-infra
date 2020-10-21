import { typeCheck } from 'type-check';
import response from '../../libs/httpResponses/response';
import { validateEmail } from '../lib/validateEmail';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { email, token } = JSON.parse(event.body);

    if (!typeCheck('[String]', [email, token])) throw new Error('wrong_argument_type');

    const { appId } = event.requestContext.authorizer;
    await validateEmail(email, token, appId);

    return response({ code: 200, body: { status: 'success' } });
  } catch (e) {
    let code;
    switch (e.message) {
      case 'app_not_found':
      case 'email_not_found':
        code = 404;
        break;
      case 'missing_payload':
      case 'invalid_email_token':
        code = 400;
        break;
      default:
        code = 500;
    }
    return response({ code, message: e.message });
  }
};

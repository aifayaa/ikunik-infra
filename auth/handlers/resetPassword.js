import { typeCheck } from 'type-check';
import response from '../../libs/httpResponses/response';
import { resetPassword } from '../lib/resetPassword';
import errorMessage from '../../libs/httpResponses/errorMessage';

const PASSWORD_MIN_LENGTH = 6;

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { email, token, password } = JSON.parse(event.body);

    if (!typeCheck('[String]', [email, token, password])) throw new Error('wrong_argument_type');
    if (password.length < PASSWORD_MIN_LENGTH) throw new Error('invalid_password_length');

    const { appId } = event.requestContext.authorizer;
    await resetPassword(email, appId, token, password);

    return response({ code: 200, body: { email, message: 'ok' } });
  } catch (e) {
    return response(errorMessage(e));
  }
};

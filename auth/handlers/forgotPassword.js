import { typeCheck } from 'type-check';
import response from '../../libs/httpResponses/response';
import { forgotPassword } from '../lib/forgotPassword';
import errorMessage from '../../libs/httpResponses/errorMessage';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { email } = JSON.parse(event.body);
    const { appId } = event.requestContext.authorizer;

    if (!typeCheck('{ email: String }', { email })) {
      throw new Error('wrong_argument_type');
    }

    await forgotPassword(email, appId);

    return response({ code: 200, body: { email, message: 'ok' } });
  } catch (e) {
    return response(errorMessage(e));
  }
};

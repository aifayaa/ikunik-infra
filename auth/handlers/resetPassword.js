/* eslint-disable import/no-relative-packages */
import { typeCheck } from 'type-check';
import response from '../../libs/httpResponses/response';
import { resetPassword } from '../lib/resetPassword';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { getUserLanguage } from '../../libs/intl/intl';

const PASSWORD_MIN_LENGTH = 6;

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const {
      email,
      token,
      password,
      appId: inputAppId,
    } = JSON.parse(event.body);

    if (!typeCheck('[String]', [email, token, password]))
      throw new Error('wrong_argument_type');
    if (password.length < PASSWORD_MIN_LENGTH)
      throw new Error('invalid_password_length');

    const lang = getUserLanguage(event.headers);
    const { appId } = event.requestContext.authorizer;
    await resetPassword(email, inputAppId || appId, token, password, lang);

    return response({ code: 200, body: { email, message: 'ok' } });
  } catch (e) {
    return response(errorMessage(e));
  }
};

/* eslint-disable import/no-relative-packages */
import { typeCheck } from 'type-check';
import response from '../../libs/httpResponses/response.ts';
import { changePassword } from '../lib/changePassword';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { getUserLanguage } from '../../libs/intl/intl';

const PASSWORD_MIN_LENGTH = 6;

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }
    const { appId } = event.requestContext.authorizer;
    const { principalId: userId } = event.requestContext.authorizer;

    const { oldPassword, password } = JSON.parse(event.body);

    if (!typeCheck('[String]', [oldPassword, password]))
      throw new Error('wrong_argument_type');
    if (password.length < PASSWORD_MIN_LENGTH)
      throw new Error('invalid_password_length');

    const lang = getUserLanguage(event.headers);
    await changePassword(userId, oldPassword, password, appId, lang);

    return response({ code: 200, body: { message: 'ok' } });
  } catch (e) {
    return response(errorMessage(e));
  }
};

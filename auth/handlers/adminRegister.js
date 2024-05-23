/* eslint-disable import/no-relative-packages */
import { typeCheck } from 'type-check';
import uuidv4 from 'uuid/v4';
import response from '../../libs/httpResponses/response.ts';
import { adminRegister } from '../lib/adminRegister';
import errorMessage from '../../libs/httpResponses/errorMessage';

const PASSWORD_MIN_LENGTH = 6;

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const {
      email,
      username = null,
      password,
      profile = {},
    } = JSON.parse(event.body);

    if (!typeCheck('[String]', [email, password]))
      throw new Error('wrong_argument_type');
    if (!typeCheck('[Object]', [profile]))
      throw new Error('wrong_argument_type');
    if (password.length < PASSWORD_MIN_LENGTH)
      throw new Error('invalid_password_length');

    const ret = await adminRegister({
      email,
      username: username || uuidv4(),
      password,
      profile,
    });

    return response({ code: 200, body: ret });
  } catch (e) {
    return response(errorMessage(e));
  }
};

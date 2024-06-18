/* eslint-disable import/no-relative-packages */
import { v4 as uuidv4 } from 'uuid';
import response from '../../libs/httpResponses/response';
import { adminRegister } from '../lib/adminRegister';
import errorMessage from '../../libs/httpResponses/errorMessage.js';
import { APIGatewayProxyEvent } from 'aws-lambda';

const PASSWORD_MIN_LENGTH = 6;

export default async (event: APIGatewayProxyEvent) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const {
      email,
      password,
      username = null,
      profile = {},
      utm = {},
    } = JSON.parse(event.body);

    if (!(typeof email === 'string' && typeof password === 'string')) {
      throw new Error('wrong_argument_type');
    }
    if (!(typeof profile === 'object')) {
      throw new Error('wrong_argument_type');
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new Error('invalid_password_length');
    }

    const ret = await adminRegister({
      email,
      username: username || uuidv4(),
      password,
      profile,
      utm,
    });

    return response({ code: 200, body: ret });
  } catch (e) {
    return response(
      errorMessage(e as { code: any; message?: string | undefined } | undefined)
    );
  }
};

/* eslint-disable import/no-relative-packages */
import { typeCheck } from 'type-check';
import response from '../../libs/httpResponses/response.ts';
import { register } from '../lib/register';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { appUserCheckUsername } from '../../users/lib/appUserChecks.ts';

const PASSWORD_MIN_LENGTH = 6;

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { email, username, password } = JSON.parse(event.body);

    if (!typeCheck('[String]', [email, username, password]))
      throw new Error('wrong_argument_type');
    if (password.length < PASSWORD_MIN_LENGTH)
      throw new Error('invalid_password_length');

    const { appId } = event.requestContext.authorizer;

    await appUserCheckUsername(username, { appId });

    const { userId } = await register(email, username, password, appId);

    return response({
      code: 200,
      body: { status: 'success', data: { _id: userId } },
    });
  } catch (e) {
    return response(errorMessage(e));
  }
};

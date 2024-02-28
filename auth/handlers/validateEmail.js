/* eslint-disable import/no-relative-packages */
import { typeCheck } from 'type-check';
import response from '../../libs/httpResponses/response';
import { validateEmail } from '../lib/validateEmail';
import errorMessage from '../../libs/httpResponses/errorMessage';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { email, token, appId: inputAppId } = JSON.parse(event.body);

    if (!typeCheck('[String]', [email, token]))
      throw new Error('wrong_argument_type');

    const { appId } = event.requestContext.authorizer;
    await validateEmail(email, token, inputAppId || appId);

    return response({ code: 200, body: { status: 'success' } });
  } catch (e) {
    return response(errorMessage(e));
  }
};

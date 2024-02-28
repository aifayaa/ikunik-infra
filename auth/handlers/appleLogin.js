/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import { getUserByApple } from '../lib/getUserByApple';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { authorizationCode, identityToken, fullName, email } = JSON.parse(
      event.body
    );
    const { appId } = event.requestContext.authorizer;
    const tokenInfo = await getUserByApple(
      authorizationCode,
      identityToken,
      appId,
      {
        fullName,
        email,
      }
    );

    /* get User in db or create new one if not exists */
    return response({ code: 200, body: tokenInfo });
  } catch (e) {
    let code;
    switch (e.message) {
      case 'invalid_token':
        code = 401;
        break;
      case 'missing_payload':
        code = 400;
        break;
      default:
        code = 500;
    }
    return response({ code, message: e.message });
  }
};

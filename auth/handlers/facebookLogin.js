/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import { getUserByFacebook } from '../lib/getUserByFacebook';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { accessToken } = JSON.parse(event.body);
    const { appId } = event.requestContext.authorizer;
    const tokenInfo = await getUserByFacebook(accessToken, appId);

    /* get User in db or create new one if not exists */
    return response({ code: 200, body: tokenInfo });
  } catch (e) {
    let code;
    let { message } = e;
    switch (e.message) {
      case 'invalid_token':
        code = 401;
        break;
      case 'missing_payload':
        code = 400;
        break;
      default:
        code = 500;
        message = 'facebook_auth_fail';
        // eslint-disable-next-line no-console
        console.error(e.message);
    }
    return response({ code, message });
  }
};

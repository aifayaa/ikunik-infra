import response from '../../libs/httpResponses/response';
import { getUserByFacebook } from '../lib/getUserByFacebook';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { accessToken } = JSON.parse(event.body);
    const tokenInfo = await getUserByFacebook(accessToken);

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

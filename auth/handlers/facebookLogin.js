import response from '../../libs/httpResponses/response';
import getUserByFb from '../lib/getUserByFacebook';

export default async (event) => {
  try {
    const { accessToken } = JSON.parse(event.body);
    const tokenInfo = await getUserByFb(accessToken);

    /* get User in db or create new one if not exists */
    return response({ code: 200, body: tokenInfo });
  } catch (e) {
    if (e.message === 'invalid_token') {
      return response({ code: 401, message: e.message });
    }
    return response({ code: 500, message: e.message });
  }
};

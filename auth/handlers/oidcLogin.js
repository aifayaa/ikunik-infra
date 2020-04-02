import response from '../../libs/httpResponses/response';
import { getUserByOidc } from '../lib/getUserByOidc';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const {
      identityToken,
    } = JSON.parse(event.body);
    const { appId } = event.requestContext.authorizer;

    [identityToken, appId].forEach((item) => {
      if (!item) throw new Error('missing_argument');
      if (item && typeof item !== 'string') {
        throw new Error('wrong_argument_type');
      }
    });

    const result = await getUserByOidc(identityToken, appId);

    /* get User in db or create new one if not exists */
    return response({ code: 200, body: result });
  } catch (e) {
    let code;
    switch (e.message) {
      case 'invalid_token':
        code = 401;
        break;
      case 'missing_argument':
      case 'wrong_argument_type':
      case 'missing_payload':
        code = 400;
        break;
      default:
        code = 500;
    }
    return response({ code, message: e.message });
  }
};

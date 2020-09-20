import { getAppTos } from '../lib/getAppTos';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const appId = event.pathParameters.id;

  try {
    const results = await getAppTos(appId);

    if (results === false) {
      return response({ code: 404, message: 'tos_not_found' });
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

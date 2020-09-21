import { getAppTos } from '../lib/getAppTos';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const appId = event.pathParameters.id;
  const options = {};
  try {
    if (event.queryStringParameters) {
      ['outdated', 'required', 'html'].forEach((v) => {
        if (typeof event.queryStringParameters[v] !== 'undefined') {
          options[v] = event.queryStringParameters[v] === 'true';
        }
      });
    }
    const results = await getAppTos(appId, options);
    if (results.length && event.queryStringParameters.html === 'true') {
      return response({
        code: 200,
        headers: {
          'Content-Type': 'text/html',
        },
        body: results,
      });
    }
    if (results.length) return response({ code: 200, body: results });
    return response({ code: 404, message: 'tos_not_found' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

import { getTos } from '../lib/getTos';
import { getHtmlResults } from '../htmlResults';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const tosId = event.pathParameters && event.pathParameters.id;
  const options = {};

  try {
    if (event.queryStringParameters) {
      ['outdated', 'required'].forEach((v) => {
        if (typeof event.queryStringParameters[v] !== 'undefined') {
          options[v] = event.queryStringParameters[v] === 'true';
        }
      });
    }
    const results = await getTos(appId, tosId, options);
    const body = getHtmlResults(results);

    if (results.length && event.headers.Accept === 'text/html') {
      return response({
        code: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
        body,
        raw: true,
      });
    }
    if (results.length) return response({ code: 200, body: results });
    return response({ code: 404, message: 'tos_not_found' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

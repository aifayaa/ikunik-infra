/* eslint-disable import/no-relative-packages */
import { getTos } from '../../termsOfServices/lib/getTos';
import { getHtmlResults } from '../../termsOfServices/htmlResults';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const appId = event.pathParameters.id;
  const options = {};
  try {
    if (event.queryStringParameters) {
      ['outdated', 'required'].forEach((v) => {
        if (typeof event.queryStringParameters[v] !== 'undefined') {
          options[v] = event.queryStringParameters[v] === 'true';
        }
      });
    }

    const results = await getTos(appId, false, {
      outdated: false,
      required: true,
    });

    if (results && results.length) {
      const body = getHtmlResults(results);

      const accept = event.headers.accept || event.headers.Accept;
      const acceptArray = accept.split(',');

      if (acceptArray.includes('text/html')) {
        return response({
          code: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
          body,
          raw: true,
        });
      }
      return response({ code: 200, body: results });
    }
    return response({ code: 404, message: 'tos_not_found' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

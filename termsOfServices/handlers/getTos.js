/* eslint-disable import/no-relative-packages */
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
      if (event.queryStringParameters.type) {
        options.type = event.queryStringParameters.type;
      }
    }
    const results = await getTos(appId, tosId, options);

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
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

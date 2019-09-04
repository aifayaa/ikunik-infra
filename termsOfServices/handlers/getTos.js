import { getTos } from '../lib/getTos';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const tosId = event.pathParameters && event.pathParameters.id;
  try {
    const results = await getTos(appId, tosId);
    if (results.length) return response({ code: 200, body: results });
    return response({ code: 404, message: 'tos_not_found' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

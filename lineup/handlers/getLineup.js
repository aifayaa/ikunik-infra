import getLineup from '../lib/getLineup';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const categoryId = event.pathParameters.id;
    const results = await getLineup(categoryId, appId);
    if (results) {
      return response({ code: 200, body: results });
    }
    return response({ code: 404, message: 'lineup_not_found' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

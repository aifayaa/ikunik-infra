import addHistory from '../lib/addHistory';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  if (userId !== urlId) {
    return response({ code: 403, message: 'Forbidden' });
  }
  try {
    const { id } = JSON.parse(event.body);
    if (!id) {
      throw new Error('Bad arguments');
    }
    const results = await addHistory(userId, id, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

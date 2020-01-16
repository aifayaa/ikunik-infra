import askPayout from '../lib/askPayout';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  const { appId, profileId } = event.requestContext.authorizer;
  if (userId !== urlId) {
    return response({ code: 403, message: 'Forbidden' });
    return;
  }
  try {
    const { amount, method } = JSON.parse(event.body);
    if (!amount || !method) {
      throw new Error('Bad arguments');
    }
    const results = await askPayout(userId, profileId, amount, method, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

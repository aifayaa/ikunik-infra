/* eslint-disable import/no-relative-packages */
import getPurchases from '../lib/getPurchases';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  const { appId, profileId } = event.requestContext.authorizer;
  if (userId !== urlId) {
    return response({ code: 403, message: 'Forbidden' });
  }
  try {
    const results = await getPurchases(userId, profileId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

import getApps from '../lib/getApps';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;

  if (userId !== urlId) {
    return response({ code: 403, message: 'Forbidden' });
  }

  try {
    const appsResults = await getApps(userId);
    return response({
      code: 200,
      body: { items: appsResults, totalCount: appsResults.length },
    });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

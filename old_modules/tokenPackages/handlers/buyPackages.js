import buyPackages from '../lib/buyPackages';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const packageId = event.pathParameters.id;
  try {
    if (!packageId) {
      throw new Error('mal formed request');
    }

    const results = await buyPackages(userId, packageId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

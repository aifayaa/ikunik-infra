import createScanners from '../lib/createScanners';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { appId, profileId } = event.requestContext.authorizer;
    const userId = event.requestContext.authorizer.principalId;
    const lineupId = event.pathParameters.id;
    if (!event.body) {
      throw new Error('mal formed request');
    }
    const { email } = JSON.parse(event.body);
    if (!lineupId || !email) {
      throw new Error('mal formed request');
    }
    const results = await createScanners(userId, profileId, lineupId, email, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

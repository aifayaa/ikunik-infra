import getScannersForLineup from '../lib/getScannersForLineup';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { appId, profileId } = event.requestContext.authorizer;
    const userId = event.requestContext.authorizer.principalId;
    const lineupId = event.pathParameters.id;
    const results = await getScannersForLineup(userId, profileId, lineupId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

import getUserLineups from '../lib/getUserLineups';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId, profileId } = event.requestContext.authorizer;
  try {
    const userId = event.requestContext.authorizer.principalId;
    const urlId = event.pathParameters.id;
    if (userId !== urlId) {
      return response({ code: 403, message: 'forbidden' });
    }

    const results = await getUserLineups(userId, profileId, appId);
    if (results) {
      return response({ code: 200, body: results });
    } else {
      return response({ code: 404, message: 'lineup_not_found' });
    }
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};


return response({ code: 404, message: 'lineups_not_found' });


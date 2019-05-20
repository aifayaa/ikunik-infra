import getUserProjects from '../lib/getUserProjects';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId, profileId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    callback(null, response({ code: 403, message: 'Forbidden' }));
    return;
  }
  try {
    const results = await getUserProjects(userId, profileId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

import getUserArtists from '../lib/getUserArtists';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  try {
    const userId = event.pathParameters.id;
    const { appId, profileId } = event.requestContext.authorizer;
    if (userId !== event.requestContext.authorizer.principalId) {
      callback(null, response({ code: 403, message: 'Forbidden' }));
      return;
    }
    const artists = await getUserArtists(profileId, appId);
    const results = { artists };
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

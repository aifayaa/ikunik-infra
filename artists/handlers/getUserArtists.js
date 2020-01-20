import getUserArtists from '../lib/getUserArtists';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const userId = event.pathParameters.id;
    const { appId, profileId } = event.requestContext.authorizer;
    if (userId !== event.requestContext.authorizer.principalId) {
      return response({ code: 403, message: 'Forbidden' });
    }
    const artists = await getUserArtists(profileId, appId);
    const results = { artists };
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

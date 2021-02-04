import getArtist from '../../artists/lib/getArtist';
import getAppFromName from '../lib/getAppFromName';
import meta from '../lib/meta';
import redirect from '../lib/redirect';
import response from '../../libs/httpResponses/response';

export const handleArtist = async (event) => {
  try {
    const userAgent = event.headers['User-Agent'];
    const redirectUrl = (event.queryStringParameters || {}).redirect_url;
    const { appName } = (event.queryStringParameters || {});
    const { _id: appId } = await getAppFromName(appName);
    const redirectResponse = await redirect(userAgent, redirectUrl, appId);
    if (redirectResponse) {
      return redirectResponse;
    }
    const artistId = event.pathParameters.id;
    const artist = await getArtist(artistId, appId);
    const body = meta(artist.artistName, artist.biography, artist.avatar);
    return response({ code: 200, body, raw: true });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

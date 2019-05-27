import getArtist from '../../artists/lib/getArtist';
import getAppId from '../lib/getAppId';
import meta from '../lib/meta';
import redirect from '../lib/redirect';

export const handleArtist = async (event, context, callback) => {
  try {
    const userAgent = event.headers['User-Agent'];
    const redirectUrl = (event.queryStringParameters || {}).redirect_url;
    const { appName } = (event.queryStringParameters || {});
    const appId = await getAppId(appName);
    const redirectResponse = redirect(userAgent, redirectUrl);
    if (redirectResponse) {
      callback(null, redirectResponse);
      return;
    }
    const artistId = event.pathParameters.id;
    const artist = await getArtist(artistId, appId);
    const body = meta(artist.artistName, artist.biography, artist.avatar);
    const response = {
      statusCode: 200,
      body,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify(e.message),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};

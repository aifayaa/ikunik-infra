import getArtist from '../lib/getArtist';
import getArtistPicture from '../lib/getArtistPicture';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  try {
    const artistId = event.pathParameters.id;
    const { appId } = event.requestContext.authorizer;
    const artist = await getArtist(artistId, appId);
    const results = artist.avatar ?
      { src: artist.avatar, title: artist.artistName } :
      await getArtistPicture(artistId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    const code = (e.message === 'not_found') ? 404 : 500;
    callback(null, response({ code, message: e.message }));
  }
};

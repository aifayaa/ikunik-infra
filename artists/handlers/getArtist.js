import getArtist from '../lib/getArtist';
import getArtistPicture from '../lib/getArtistPicture';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const artistId = event.pathParameters.id;
    const { appId } = event.requestContext.authorizer;
    const artist = await getArtist(artistId, appId);
    if (!artist.avatar) {
      try {
        const pic = await getArtistPicture(artistId, appId);
        artist.avatar = pic.src;
      } catch (e) {
        console.error('error while getting picture', e);
      }
    }
    return response({ code: 200, body: artist });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

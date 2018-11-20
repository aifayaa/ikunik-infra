import getArtist from '../../artists/lib/getArtist';
import meta from '../lib/meta';

export const handleArtist = async (event, context, callback) => {
  try {
    const artistId = event.pathParameters.id;
    const artist = await getArtist(artistId);
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
    };
    callback(null, response);
  }
};

import { MongoClient } from 'mongodb';

const doGetArtist = async (artistId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const artist = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne({ _id: artistId });
    return artist;
  } finally {
    client.close();
  }
};

const doGetArtistPicture = async (artistId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const project = await client.db(process.env.DB_NAME).collection('Project')
      .findOne({
        artist_ID: artistId,
        iconeThumbFileUrl: { $exists: true },
        projectIsValidated: true,
      }, {
        sort: { createdAt: -1 },
      });
    if (!project) throw new Error('Not Found');
    return { src: project.iconeThumbFileUrl, title: project.projectName };
  } finally {
    client.close();
  }
};

export const handleGetArtist = async (event, context, callback) => {
  try {
    const artistId = event.pathParameters.id;
    const artist = await doGetArtist(artistId);
    if (!artist.avatar) {
      try {
        const pic = await doGetArtistPicture(artistId);
        artist.avatar = pic.src;
      } catch (e) {
        console.error('error while getting picture', e);
      }
    }
    const response = {
      statusCode: 200,
      body: JSON.stringify(artist),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};

export const handleGetArtistPicture = async (event, context, callback) => {
  try {
    let results;
    const artistId = event.pathParameters.id;
    const artist = await doGetArtist(artistId);
    if (artist && artist.avatar) {
      results = { src: artist.avatar, title: artist.artistName };
    } else {
      results = await doGetArtistPicture(artistId);
    }
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};

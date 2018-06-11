import { MongoClient } from 'mongodb';

const artistFields = [
  'artistName',
  'avatar',
  'biography',
  'country',
  'facebook',
  'instagram',
  'profil_ID',
  'project_ID',
  'project_IDs',
  'snapshat',
  'twitter',
  'website',
];

const doGetArtist = async (artistId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const artist = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .aggregate([
        {
          $match: {
            _id: artistId,
          },
        }, {
          $unwind: {
            path: '$project_IDs',
            preserveNullAndEmptyArrays: true,
          },
        }, {
          $lookup: {
            from: 'Project',
            localField: 'project_IDs',
            foreignField: '_id',
            as: 'project',
          },
        }, {
          $unwind: {
            path: '$project',
            preserveNullAndEmptyArrays: true,
          },
        }, {
          $unwind: {
            path: '$project.selectedGenres',
            preserveNullAndEmptyArrays: true,
          },
        }, {
          $group:
            Object.assign({}, ...artistFields.map(field => ({ [field]: { $first: `$${field}` } })), {
              _id: '$_id',
              genres: { $addToSet: '$project.selectedGenres.text' },
            }),
        },
      ]).toArray();
    if (!artist) throw new Error('Not Found');
    return (artist[0]);
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

const doGetUserArtists = async (userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const [profil] = await client.db(process.env.DB_NAME).collection('profil')
      .aggregate([
        { $match: { UserId: userId } },
        {
          $lookup: {
            from: 'artists',
            localField: '_id',
            foreignField: 'profil_ID',
            as: 'artists',
          },
        },
      ]).toArray();
    if (!profil) return [];
    return profil.artists;
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

export const handleGetUserArtists = async (event, context, callback) => {
  try {
    const userId = event.pathParameters.id;
    if (userId !== event.requestContext.authorizer.principalId) {
      callback(null, {
        statusCode: 403,
        body: JSON.stringify({ message: 'Forbidden' }),
      });
      return;
    }
    const artists = await doGetUserArtists(userId);
    const results = { artists };
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

import { MongoClient } from 'mongodb';

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
            as: 'projectObject',
          },
        }, {
          $group: {
            _id: '$_id',
            artistName: { $push: '$artistName' },
            biography: { $push: '$biography' },
            snapshat: { $push: '$snapshat' },
            facebook: { $push: '$facebook' },
            instagram: { $push: '$instagram' },
            twitter: { $push: '$twitter' },
            profil_ID: { $push: '$profil_ID' },
            project_IDs: { $push: '$project_IDs' },
            project_ID: { $push: '$project_ID' },
            genres: { $addToSet: '$projectObject.selectedGenres.text' },
          },
        }, {
          $project: {
            artistName: { $arrayElemAt: ['$artistName', 0] },
            biography: { $arrayElemAt: ['$biography', 0] },
            snapshat: { $arrayElemAt: ['$snapshat', 0] },
            facebook: { $arrayElemAt: ['$facebook', 0] },
            instagram: { $arrayElemAt: ['$instagram', 0] },
            twitter: { $arrayElemAt: ['$twitter', 0] },
            profil_ID: { $arrayElemAt: ['$profil_ID', 0] },
            project_ID: { $arrayElemAt: ['$project_ID', 0] },
            project_IDs: '$project_IDs',
            genres: { $arrayElemAt: ['$genres', 0] },
          },
        }, {
          $unwind: {
            path: '$genres',
            preserveNullAndEmptyArrays: true,
          },
        },
      ]).toArray();
    console.log(artist[0]);
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

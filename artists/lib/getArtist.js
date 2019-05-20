import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_ARTISTS,
  COLL_PROJECTS,
} = process.env;

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

export default async (artistId, appId) => {
  const client = await MongoClient.connect(MONGO_URL);
  try {
    const artist = await client
      .db(DB_NAME)
      .collection(COLL_ARTISTS)
      .aggregate([
        {
          $match: {
            _id: artistId,
            appIds: { $elemMatch: { $eq: appId } },
          },
        },
        {
          $unwind: {
            path: '$project_IDs',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: COLL_PROJECTS,
            localField: 'project_IDs',
            foreignField: '_id',
            as: 'project',
          },
        },
        {
          $unwind: {
            path: '$project',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: '$project.selectedGenres',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: Object.assign(
            {},
            ...artistFields.map(field => ({ [field]: { $first: `$${field}` } })),
            {
              _id: '$_id',
              genres: { $addToSet: '$project.selectedGenres.text' },
            },
          ),
        },
      ])
      .toArray();
    if (!artist) throw new Error('not_found');
    return artist[0];
  } finally {
    client.close();
  }
};

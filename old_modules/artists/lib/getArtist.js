import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_ARTISTS,
  COLL_PROJECTS,
} = mongoCollections;

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
  const client = await MongoClient.connect();
  try {
    const artist = await client
      .db()
      .collection(COLL_ARTISTS)
      .aggregate([
        {
          $match: {
            _id: artistId,
            appId,
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
            ...artistFields.map((field) => ({ [field]: { $first: `$${field}` } })),
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

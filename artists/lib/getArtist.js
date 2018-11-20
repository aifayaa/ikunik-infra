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

export default async (artistId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const artist = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .aggregate([
        {
          $match: {
            _id: artistId,
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
            from: 'Project',
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
    if (!artist) throw new Error('Not Found');
    return artist[0];
  } finally {
    client.close();
  }
};

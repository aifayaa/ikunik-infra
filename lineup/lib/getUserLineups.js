import { MongoClient } from 'mongodb';

// TODO optimize by using another function properly for lineupId
export default async (userId, lineupId) => {
  const aggregat = [
    { $match: { UserId: userId } },
    {
      $lookup: {
        from: 'artists',
        localField: '_id',
        foreignField: 'profil_ID',
        as: 'artists',
      },
    },
    {
      $unwind: {
        path: '$artists',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'lineup',
        localField: 'artists._id',
        foreignField: 'artistId',
        as: 'lineups',
      },
    },
    {
      $unwind: {
        path: '$lineups',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: null,
        lineups: { $push: '$lineups' },
      },
    },
  ];
  if (lineupId) {
    aggregat.push({
      $unwind: {
        path: '$lineups',
        preserveNullAndEmptyArrays: true,
      },
    });
    aggregat.push({ $match: { 'lineups._id': lineupId } });
  }
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    let lineups = await client.db(process.env.DB_NAME).collection('profil')
      .aggregate(aggregat).toArray();
    const [res] = lineups;
    ({ lineups } = res);
    if (lineupId) {
      return lineups;
    }
    return { lineups };
  } finally {
    client.close();
  }
};

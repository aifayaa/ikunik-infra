import MongoClient from '../../libs/mongoClient';

const {
  COLL_ARTISTS,
  COLL_LINEUPS,
  DB_NAME,
} = process.env;

// TODO optimize by using another function properly for lineupId
export default async (userId, profileId, lineupId, appId) => {
  const aggregat = [
    {
      $match: {
        profil_ID: profileId,
        appIds: { $elemMatch: { $eq: appId } },
      },
    },
    {
      $lookup: {
        from: COLL_LINEUPS,
        localField: '_id',
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
    { $match: { 'lineups.startDate': { $gte: new Date() } } },
    {
      $sort: { 'lineups.startDate': 1, 'lineups.name': 1 },
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
  const client = await MongoClient.connect();
  try {
    let lineups = await client
      .db(DB_NAME)
      .collection(COLL_ARTISTS)
      .aggregate(aggregat)
      .toArray();
    const [res] = lineups;
    if (!res) return null;
    ({ lineups } = res);
    if (lineupId) {
      return lineups;
    }
    return { lineups };
  } finally {
    client.close();
  }
};

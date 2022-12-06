import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_LINEUPS,
  COLL_TICKET_CATEGORIES,
  COLL_STAGES,
} = mongoCollections;

export default async (categoryId, appId) => {
  const client = await MongoClient.connect();
  try {
    const ticketCat = await client
      .db()
      .collection(COLL_TICKET_CATEGORIES)
      .aggregate([
        {
          $match: {
            _id: categoryId,
            appId,
          },
        },
        {
          $lookup: {
            from: COLL_LINEUPS,
            localField: 'lineupId',
            foreignField: '_id',
            as: 'lineup',
          },
        },
        {
          $unwind: {
            path: '$lineup',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: COLL_STAGES,
            localField: 'lineup.stageId',
            foreignField: '_id',
            as: 'stage',
          },
        },
        {
          $unwind: {
            path: '$stage',
            preserveNullAndEmptyArrays: true,
          },
        },
      ]).toArray();
    return ticketCat[0] || null;
  } finally {
    client.close();
  }
};

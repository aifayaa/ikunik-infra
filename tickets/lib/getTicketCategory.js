import { MongoClient } from 'mongodb';

const {
  COLL_LINEUPS,
  COLL_TICKET_CATEGORIES,
  COLL_STAGES,
  DB_NAME,
  MONGO_URL,
} = process.env;

export default async (categoryId, appId) => {
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
  try {
    const ticketCat = await client
      .db(DB_NAME)
      .collection(COLL_TICKET_CATEGORIES)
      .aggregate([
        {
          $match: {
            _id: categoryId,
            appIds: { $elemMatch: { $eq: appId } },
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

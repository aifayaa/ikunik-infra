import { MongoClient } from 'mongodb';

const {
  COLL_LINEUPS,
  COLL_TICKETS,
  COLL_TICKET_CATEGORIES,
  DB_NAME,
  MONGO_URL,
} = process.env;

export default async (userId, appId) => {
  let client;
  try {
    client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
    return await client.db(DB_NAME)
      .collection(COLL_TICKETS)
      .aggregate([
        {
          $match: {
            userId,
            appIds: { $elemMatch: { $eq: appId } },
          },
        },
        {
          $lookup: {
            from: COLL_TICKET_CATEGORIES,
            localField: 'categoryId',
            foreignField: '_id',
            as: 'ticketCategory',
          },
        },
        {
          $unwind: {
            path: '$ticketCategory',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: COLL_LINEUPS,
            localField: 'ticketCategory.lineupId',
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
          $project: { serial: 0 },
        },
      ]).toArray();
  } finally {
    client.close();
  }
};

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_LINEUPS,
  COLL_TICKETS,
  COLL_TICKET_CATEGORIES,
} = mongoCollections;

export default async (userId, appId) => {
  let client;
  try {
    client = await MongoClient.connect();
    return await client.db()
      .collection(COLL_TICKETS)
      .aggregate([
        {
          $match: {
            userId,
            appId,
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

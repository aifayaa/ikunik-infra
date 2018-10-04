import { MongoClient } from 'mongodb';

export default async (lineupId, categoryId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL);
    return await client.db(process.env.DB_NAME)
      .collection('ticketCategories')
      .aggregate([
        {
          $match: { _id: categoryId, lineupId },
        }, {
          $lookup: {
            from: 'lineup',
            localField: 'lineupId',
            foreignField: '_id',
            as: 'lineup',
          },
        }, {
          $unwind: {
            path: '$lineup',
            preserveNullAndEmptyArrays: true,
          },
        }, {
          $lookup: {
            from: 'stages',
            localField: 'lineup.stageId',
            foreignField: '_id',
            as: 'stage',
          },
        }, {
          $unwind: {
            path: '$stage',
            preserveNullAndEmptyArrays: true,
          },
        },
      ]).toArray();
  } finally {
    client.close();
  }
};

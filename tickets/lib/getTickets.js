import { MongoClient } from 'mongodb';

export default async (userId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    return await client.db(process.env.DB_NAME)
      .collection('tickets')
      .aggregate([
        { $match: { userId } },
        {
          $lookup: {
            from: 'ticketCategories',
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
            from: 'lineup',
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

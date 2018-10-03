import { MongoClient } from 'mongodb';

export default async (selectionId, userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const [{ subscriptions }] = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .aggregate([
        {
          $match: {
            _id: selectionId,
            userId,
          },
        },
        {
          $unwind: {
            path: '$subscriptionIds',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: 'subscriptions',
            localField: 'subscriptionIds',
            foreignField: '_id',
            as: 'subscription',
          },
        },
        {
          $unwind: {
            path: '$subscription',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $group: {
            _id: null,
            subscriptions: {
              $addToSet: '$subscription',
            },
          },
        },
      ]).toArray();
    return subscriptions;
  } finally {
    client.close();
  }
};

import { MongoClient } from 'mongodb';

export default async (selectionId, userId, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const [{ subscriptions }] = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_SELECTIONS)
      .aggregate([
        {
          $match: {
            _id: selectionId,
            userId,
            appIds: { $elemMatch: { $eq: appId } },
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
            from: process.env.COLL_SUBSCRIPTIONS,
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

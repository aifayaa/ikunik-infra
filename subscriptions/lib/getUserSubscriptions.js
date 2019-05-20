import { MongoClient } from 'mongodb';

const {
  COLL_SUBSCRIPTIONS,
  COLL_USER_SUBSCRIPTIONS,
  DB_NAME,
  MONGO_URL,
} = process.env;

export default async (userId, appId) => {
  const client = await MongoClient.connect(MONGO_URL);
  try {
    const res = await client
      .db(DB_NAME)
      .collection(COLL_USER_SUBSCRIPTIONS)
      .aggregate([
        {
          $match: {
            userId,
            appIds: { $elemMatch: { $eq: appId } },
          },
        },
        {
          $lookup: {
            from: COLL_SUBSCRIPTIONS,
            localField: 'subscriptionId',
            foreignField: '_id',
            as: 'subscription',
          },
        },
        {
          $unwind: {
            path: '$subscriptions', preserveNullAndEmptyArrays: true,
          },
        },
      ]).toArray();
    return { subscriptions: res };
  } catch (e) {
    throw e;
  } finally {
    client.close();
  }
};

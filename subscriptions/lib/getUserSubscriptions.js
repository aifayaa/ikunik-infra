import MongoClient from '../../libs/mongoClient'

const {
  COLL_SUBSCRIPTIONS,
  COLL_USER_SUBSCRIPTIONS,
  DB_NAME,
  MONGO_URL,
} = process.env;

export default async (userId, appId) => {
  const client = await MongoClient.connect();
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
  } finally {
    client.close();
  }
};

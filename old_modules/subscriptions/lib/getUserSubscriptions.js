import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_SUBSCRIPTIONS,
  COLL_USER_SUBSCRIPTIONS,
} = mongoCollections;

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  try {
    const res = await client
      .db()
      .collection(COLL_USER_SUBSCRIPTIONS)
      .aggregate([
        {
          $match: {
            userId,
            appId,
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

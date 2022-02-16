import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (userId, subIds, appId) => {
  if (!subIds) return true;
  subIds = Array.isArray(subIds) ? subIds : [subIds];
  if (!subIds.length) return true;
  const client = await MongoClient.connect();
  try {
    const res = await client
      .db()
      .collection(mongoCollections.COLL_USER_SUBSCRIPTIONS)
      .findOne({
        appId,
        expireAt: { $gt: new Date() },
        subscriptionId: { $in: subIds },
        userId,
      });
    return !!res;
  } finally {
    client.close();
  }
};

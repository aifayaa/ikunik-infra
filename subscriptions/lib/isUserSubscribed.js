import MongoClient from '../../libs/mongoClient'

export default async (userId, subIds, appId) => {
  if (!subIds) return true;
  subIds = Array.isArray(subIds) ? subIds : [subIds];
  if (!subIds.length) return true;
  const client = await MongoClient.connect();
  try {
    const res = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_USER_SUBSCRIPTIONS)
      .findOne({
        appIds: { $elemMatch: { $eq: appId } },
        expireAt: { $gt: new Date() },
        subscriptionId: { $in: subIds },
        userId,
      });
    return !!res;
  } finally {
    client.close();
  }
};

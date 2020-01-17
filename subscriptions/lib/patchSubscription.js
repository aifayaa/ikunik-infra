import { MongoClient } from 'mongodb';

export default async (userId, _id, appId, patch) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  try {
    const allowedOperations = ['$set'];
    const allowedFields = ['name', 'price', 'desc', 'duration'];
    Object.keys(patch).forEach(((key) => {
      if (!allowedOperations.includes(key)) {
        throw new Error('operation not allowed');
      }
      Object.keys(patch[key]).forEach((fKey) => {
        if (!allowedFields.includes(fKey)) {
          throw new Error('operation not allowed');
        }
      });
    }));

    return await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_SUBSCRIPTIONS)
      .findOneAndUpdate({
        _id,
        appIds: { $elemMatch: { $eq: appId } },
        userId,
      }, patch, { returnOriginal: false });
  } finally {
    client.close();
  }
};

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (userId, _id, appId, patch) => {
  const client = await MongoClient.connect();
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

    return await client.db()
      .collection(mongoCollections.COLL_SUBSCRIPTIONS)
      .findOneAndUpdate({
        _id,
        appId,
        userId,
      }, patch, { returnOriginal: false });
  } finally {
    client.close();
  }
};

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (id, appId) => {
  const client = await MongoClient.connect();
  try {
    return await client
      .db()
      .collection(mongoCollections.COLL_PAYOUTS)
      .findOne({
        _id: id,
        appId,
      });
  } finally {
    client.close();
  }
};

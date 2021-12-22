import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (subId, appId) => {
  const client = await MongoClient.connect();
  try {
    const sub = await client
      .db()
      .collection(mongoCollections.COLL_SUBSCRIPTIONS)
      .findOne({
        _id: subId,
        appId,
      });
    return sub;
  } finally {
    client.close();
  }
};

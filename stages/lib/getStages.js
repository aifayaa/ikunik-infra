import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const stages = await client
      .db()
      .collection(mongoCollections.COLL_STAGES)
      .find({ appId })
      .toArray();
    return stages;
  } finally {
    client.close();
  }
};

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (stageId, appId) => {
  const client = await MongoClient.connect();
  try {
    const stage = await client
      .db()
      .collection(mongoCollections.COLL_STAGES)
      .findOne({
        _id: stageId,
        appId,
      });
    return stage;
  } finally {
    client.close();
  }
};

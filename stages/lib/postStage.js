import uuidv4 from 'uuid/v4';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (name, addr, appId) => {
  if (typeof name !== 'string') {
    throw new Error('bad arguments');
  }
  const stageId = uuidv4();
  const client = await MongoClient.connect();
  try {
    const stage = {
      _id: stageId,
      appId,
      name,
      addr,
    };
    await client
      .db()
      .collection(mongoCollections.COLL_STAGES)
      .insertOne(stage);
    return stageId;
  } finally {
    client.close();
  }
};

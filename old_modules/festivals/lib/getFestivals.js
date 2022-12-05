import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_FESTIVALS } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const festivals = await client
      .db()
      .collection(COLL_FESTIVALS)
      .find({ appId })
      .toArray();
    return festivals;
  } finally {
    client.close();
  }
};

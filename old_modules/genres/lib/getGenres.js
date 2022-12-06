import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const genres = await client
      .db()
      .collection(mongoCollections.COLL_GENRES)
      .find({ appId })
      .toArray();
    return { genres };
  } finally {
    client.close();
  }
};

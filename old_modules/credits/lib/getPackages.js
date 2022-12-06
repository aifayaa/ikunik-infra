import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_CREDIT_PACKAGES } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const packages = await client
      .db()
      .collection(COLL_CREDIT_PACKAGES)
      .find({ appId })
      .toArray();
    return { packages };
  } finally {
    client.close();
  }
};

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ADVERTISEMENTS } = mongoCollections;

export default async (adId, appId) => {
  const client = await MongoClient.connect();

  try {
    const ad = await client
      .db()
      .collection(COLL_ADVERTISEMENTS)
      .findOne({ _id: adId, appId });

    return (ad);
  } finally {
    client.close();
  }
};

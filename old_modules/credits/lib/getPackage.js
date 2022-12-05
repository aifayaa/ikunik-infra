import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_CREDIT_PACKAGES } = mongoCollections;

export default async (id, appId) => {
  const client = await MongoClient.connect();
  try {
    const creditPackage = await client
      .db()
      .collection(COLL_CREDIT_PACKAGES)
      .findOne({
        _id: id,
        appId,
      });
    return creditPackage;
  } finally {
    client.close();
  }
};

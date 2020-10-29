import MongoClient from '../../libs/mongoClient';

export default async (packageId, appId) => {
  const client = await MongoClient.connect();
  try {
    return await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_TOKEN_PACKAGES)
      .findOne({
        _id: packageId,
        appId,
      });
  } finally {
    client.close();
  }
};

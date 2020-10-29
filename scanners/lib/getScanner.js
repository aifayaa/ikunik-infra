import MongoClient from '../../libs/mongoClient';

export default async (scannerId, appId) => {
  const client = await MongoClient.connect();
  try {
    return await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SCANNERS)
      .findOne({
        _id: scannerId,
        appId,
      });
  } finally {
    client.close();
  }
};

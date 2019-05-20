import { MongoClient } from 'mongodb';

export default async (scannerId, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    return await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SCANNERS)
      .findOne({
        _id: scannerId,
        appIds: { $elemMatch: { $eq: appId } },
      });
  } finally {
    client.close();
  }
};

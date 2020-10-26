import MongoClient from '../../libs/mongoClient';

export default async (id, appId) => {
  const client = await MongoClient.connect();
  try {
    return await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_PAYOUTS)
      .findOne({
        _id: id,
        appIds: appId,
      });
  } finally {
    client.close();
  }
};

import MongoClient from '../../libs/mongoClient';

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const genres = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_GENRES)
      .find({ appIds: appId })
      .toArray();
    return { genres };
  } finally {
    client.close();
  }
};

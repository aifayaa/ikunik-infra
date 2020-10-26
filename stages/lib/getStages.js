import MongoClient from '../../libs/mongoClient';

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const stages = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_STAGES)
      .find({ appIds: appId })
      .toArray();
    return stages;
  } finally {
    client.close();
  }
};

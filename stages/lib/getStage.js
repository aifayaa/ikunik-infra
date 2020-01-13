import { MongoClient } from 'mongodb';

export default async (stageId, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const stage = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_STAGES)
      .findOne({
        _id: stageId,
        appIds: { $elemMatch: { $eq: appId } },
      });
    return stage;
  } finally {
    client.close();
  }
};

import MongoClient from '../../libs/mongoClient';

export default async (stageId, appId) => {
  const client = await MongoClient.connect();
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

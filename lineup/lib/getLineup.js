import { MongoClient } from 'mongodb';

export default async (lineupId, appId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
    return await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_LINEUPS)
      .findOne({
        _id: lineupId,
        appIds: { $elemMatch: { $eq: appId } },
      });
  } finally {
    client.close();
  }
};

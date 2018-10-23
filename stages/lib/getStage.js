import { MongoClient } from 'mongodb';

export default async (stageId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const stage = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne({ _id: stageId });
    return stage;
  } finally {
    client.close();
  }
};

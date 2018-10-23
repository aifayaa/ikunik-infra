import { MongoClient } from 'mongodb';

export default async () => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const stages = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .find().toArray();
    return stages;
  } finally {
    client.close();
  }
};

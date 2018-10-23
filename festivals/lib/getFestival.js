import { MongoClient } from 'mongodb';

export default async (festivalId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const festival = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne({ _id: festivalId });
    return festival;
  } finally {
    client.close();
  }
};

import { MongoClient } from 'mongodb';

export default async (lineupId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    return await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .findOne({ _id: lineupId });
  } finally {
    client.close();
  }
};

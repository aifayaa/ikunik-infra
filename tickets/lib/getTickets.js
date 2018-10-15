import { MongoClient } from 'mongodb';

export default async (userId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    return await client.db(process.env.DB_NAME)
      .collection('tickets')
      .find({ userId }, { sort: { createdAt: -1 } }).toArray();
  } finally {
    client.close();
  }
};

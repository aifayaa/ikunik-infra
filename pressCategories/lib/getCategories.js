import { MongoClient } from 'mongodb';

export default async () => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    const categories = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .find({}, { sort: { name: -1 } }).toArray();
    return { categories };
  } finally {
    client.close();
  }
};

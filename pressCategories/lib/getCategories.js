import { MongoClient } from 'mongodb';

export default async () => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    return await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .find({}, { sort: { name: -1 } }).toArray();
  } finally {
    client.close();
  }
};

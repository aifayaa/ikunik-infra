import { MongoClient } from 'mongodb';

export default async (selection) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SELECTIONS_BACKUP)
      .replaceOne({ _id: selection._id }, selection, { upsert: true });
    return;
  } finally {
    client.close();
  }
};

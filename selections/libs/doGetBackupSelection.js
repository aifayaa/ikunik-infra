import { MongoClient } from 'mongodb';

export default async (selectionId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selection = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SELECTIONS_BACKUP)
      .findOne({ _id: selectionId });
    if (!selection) throw new Error('Not found');
    return selection;
  } finally {
    client.close();
  }
};

import MongoClient from '../../libs/mongoClient';

export default async (selection) => {
  const client = await MongoClient.connect();
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

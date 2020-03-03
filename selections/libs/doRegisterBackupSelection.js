import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_SELECTIONS_BACKUP,
} = process.env;

export default async (selection) => {
  const client = await MongoClient.connect();
  try {
    await client
      .db(DB_NAME)
      .collection(COLL_SELECTIONS_BACKUP)
      .replaceOne({ _id: selection._id }, selection, { upsert: true });
    return;
  } finally {
    client.close();
  }
};

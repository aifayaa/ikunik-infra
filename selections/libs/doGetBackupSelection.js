import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_SELECTIONS_BACKUP,
} = process.env;

export default async (selectionId) => {
  const client = await MongoClient.connect();
  try {
    const selection = await client
      .db(DB_NAME)
      .collection(COLL_SELECTIONS_BACKUP)
      .findOne({ _id: selectionId });
    if (!selection) throw new Error('Not found');
    return selection;
  } finally {
    client.close();
  }
};

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_SELECTIONS_BACKUP } = mongoCollections;

export default async (selection) => {
  const client = await MongoClient.connect();
  try {
    await client
      .db()
      .collection(COLL_SELECTIONS_BACKUP)
      .replaceOne({ _id: selection._id }, selection, { upsert: true });
    return;
  } finally {
    client.close();
  }
};

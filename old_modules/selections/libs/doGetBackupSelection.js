import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_SELECTIONS_BACKUP } = mongoCollections;

export default async (selectionId) => {
  const client = await MongoClient.connect();
  try {
    const selection = await client
      .db()
      .collection(COLL_SELECTIONS_BACKUP)
      .findOne({ _id: selectionId });
    if (!selection) throw new Error('Not found');
    return selection;
  } finally {
    client.close();
  }
};

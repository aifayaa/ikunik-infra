import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (selectionIds, userId) => {
  const client = await MongoClient.connect();
  try {
    const selections = await client
      .db()
      .collection(mongoCollections.COLL_SELECTIONS)
      .find({ _id: { $in: selectionIds }, userId: { $ne: userId } })
      .count();
    return selections === 0;
  } finally {
    client.close();
  }
};

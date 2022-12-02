import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (categoryId, appId) => {
  const client = await MongoClient.connect();
  try {
    const tickets = await client
      .db()
      .collection(mongoCollections.COLL_TICKETS)
      .countDocuments({
        categoryId,
        appId,
      });
    return tickets;
  } finally {
    client.close();
  }
};

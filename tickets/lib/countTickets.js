import MongoClient from '../../libs/mongoClient';

export default async (categoryId, appId) => {
  const client = await MongoClient.connect();
  try {
    const tickets = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_TICKETS)
      .countDocuments({
        categoryId,
        appId,
      });
    return tickets;
  } finally {
    client.close();
  }
};

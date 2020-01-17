import { MongoClient } from 'mongodb';

export default async (categoryId, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  try {
    const tickets = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_TICKETS)
      .countDocuments({
        categoryId,
        appIds: { $elemMatch: { $eq: appId } },
      });
    return tickets;
  } finally {
    client.close();
  }
};

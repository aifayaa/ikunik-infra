import { MongoClient } from 'mongodb';

export default async (lineupId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const ticketCategories = await client.db(process.env.DB_NAME)
      .collection('ticketCategories')
      .find({ lineupId })
      .toArray();
    return { ticketCategories };
  } finally {
    client.close();
  }
};

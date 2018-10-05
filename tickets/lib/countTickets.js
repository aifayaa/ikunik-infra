import { MongoClient } from 'mongodb';

export default async (lineupId, categoryId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const tickets = await client.db(process.env.DB_NAME).collection('tickets')
      .countDocuments({ categoryId, lineupId });
    return tickets;
  } finally {
    client.close();
  }
};

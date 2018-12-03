import { MongoClient } from 'mongodb';

export default async (categoryId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const tickets = await client.db(process.env.DB_NAME).collection('tickets')
      .countDocuments({ categoryId });
    return tickets;
  } finally {
    client.close();
  }
};

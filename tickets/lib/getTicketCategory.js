import { MongoClient } from 'mongodb';

export default async (categoryId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    return await client.db(process.env.DB_NAME)
      .collection('ticketCategories')
      .findOne({ _id: categoryId });
  } finally {
    client.close();
  }
};

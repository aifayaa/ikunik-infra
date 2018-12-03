import { MongoClient } from 'mongodb';

export default async () => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const packages = await client.db(process.env.DB_NAME).collection('creditPackages')
      .find({}).toArray();
    return { packages };
  } finally {
    client.close();
  }
};

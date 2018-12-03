import { MongoClient } from 'mongodb';

export default async (id) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const creditPackage = await client.db(process.env.DB_NAME).collection('creditPackages')
      .findOne({ _id: id });
    return creditPackage;
  } finally {
    client.close();
  }
};

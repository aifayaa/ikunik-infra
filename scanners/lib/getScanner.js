import { MongoClient } from 'mongodb';

export default async (scannerId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    return await client.db(process.env.DB_NAME)
      .collection('scanners')
      .findOne({ _id: scannerId });
  } finally {
    client.close();
  }
};

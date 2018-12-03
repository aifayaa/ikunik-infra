import { MongoClient } from 'mongodb';

export default async (userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const profile = await client.db(process.env.DB_NAME).collection('profil')
      .findOne({ UserId: userId });
    return profile;
  } finally {
    client.close();
  }
};

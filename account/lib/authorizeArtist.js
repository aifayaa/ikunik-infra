
import { MongoClient } from 'mongodb';

export default async (hashedToken) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const user = await client.db('crowdaaDev').collection('users').findOne(
      {
        'services.resume.loginTokens': { $elemMatch: { hashedToken } },
        profil_ID: { $exists: true },
      },
      { projection: { _id: 1 } },
    );
    return user && user._id;
  } finally {
    client.close();
  }
};

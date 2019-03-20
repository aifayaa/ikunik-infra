import { MongoClient } from 'mongodb';

export default async (hashedToken) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const user = await client.db('crowdaaDev').collection('users').findOne(
      {
        $or: [
          { 'services.resume.loginTokens': { $elemMatch: { hashedToken } } },
          { 'services.apiTokens': { $elemMatch: { hashedToken } } },
        ],
      },
      { projection: { _id: 1 } },
    );
    return user;
  } finally {
    client.close();
  }
};

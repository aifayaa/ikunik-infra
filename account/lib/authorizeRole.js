
import { MongoClient } from 'mongodb';

export default async (hashedToken) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const user = await client.db('crowdaaDev').collection('users').findOne(
      {
        $or: [
          { 'services.resume.loginTokens': { $elemMatch: { hashedToken } } },
          { 'services.apiTokens': { $elemMatch: { hashedToken } } },
        ],
        roles: { $exists: true, $ne: [] },
      },
      { projection: { _id: 1, roles: 1 } },
    );
    return {
      id: user && user._id,
      roles: user && user.roles,
    };
  } finally {
    client.close();
  }
};

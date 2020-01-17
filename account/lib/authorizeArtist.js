import { MongoClient } from 'mongodb';

export default async (hashedToken) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  try {
    const user = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_USERS)
      .findOne(
        {
          $or: [
            { 'services.resume.loginTokens': { $elemMatch: { hashedToken } } },
            { 'services.apiTokens': { $elemMatch: { hashedToken } } },
          ],
        },
        { projection: { _id: 1 } },
      );
    return user && user._id;
  } finally {
    client.close();
  }
};

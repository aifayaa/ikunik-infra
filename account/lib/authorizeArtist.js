import MongoClient from '../../libs/mongoClient';

const {
  COLL_USERS,
  DB_NAME,
} = process.env;

export default async (hashedToken) => {
  const client = await MongoClient.connect();
  try {
    const user = await client
      .db(DB_NAME)
      .collection(COLL_USERS)
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

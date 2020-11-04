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
        { projection: { _id: 1, roles: 1, profil_ID: 1 } },
      );
    user.roles = user.roles || [];
    if (user && user.profil_ID) user.roles.push('artist');
    return {
      id: user && user._id,
      roles: user && user.roles,
    };
  } finally {
    client.close();
  }
};

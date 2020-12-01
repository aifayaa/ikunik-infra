import MongoClient from '../../libs/mongoClient';

const {
  ADMIN_APP,
  COLL_USERS,
  DB_NAME,
} = process.env;

export default async (hashedToken, appId) => {
  const client = await MongoClient.connect();
  try {
    const conds = {
      $or: [
        { 'services.resume.loginTokens': { $elemMatch: { hashedToken } } },
        { 'services.apiTokens': { $elemMatch: { hashedToken } } },
      ],
    };

    if (appId) {
      conds.appIds = { $in: [appId, ADMIN_APP] };
    }

    const user = await client
      .db(DB_NAME)
      .collection(COLL_USERS)
      .findOne(
        conds,
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

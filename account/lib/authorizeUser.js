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
        { 'services.resume.loginTokens.hashedToken': hashedToken },
        { 'services.apiTokens.hashedToken': hashedToken },
      ],
    };

    if (appId) {
      conds.appId = { $in: [appId, ADMIN_APP] };
    }

    const user = await client
      .db(DB_NAME)
      .collection(COLL_USERS)
      .findOne(
        conds,
        { projection: { _id: 1 } },
      );
    return user;
  } finally {
    client.close();
  }
};

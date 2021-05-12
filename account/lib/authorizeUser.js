import MongoClient from '../../libs/mongoClient';

const {
  ADMIN_APP,
  COLL_USERS,
  DB_NAME,
} = process.env;

export default async (hashedToken, appId) => {
  const client = await MongoClient.connect();
  try {
    const usersCollection = client
      .db(DB_NAME)
      .collection(COLL_USERS);

    const conds = {
      $or: [
        { 'services.resume.loginTokens.hashedToken': hashedToken },
        { 'services.apiTokens.hashedToken': hashedToken },
      ],
    };

    if (appId) {
      conds.appId = { $in: [appId, ADMIN_APP] };
    }

    const user = await usersCollection.findOne(
      conds,
      { projection: {
        _id: 1,
        'services.resume.loginTokens.$': 1,
      } },
    );

    if (user && user.services.resume && user.services.resume.loginTokens) {
      const [dbToken] = user.services.resume.loginTokens;
      if (dbToken && dbToken.backend === 'wordpress') {
        if (dbToken.expiresAt <= Date.now()) {
          await usersCollection.updateOne(
            { _id: user._id },
            {
              $pull: {
                'services.resume.loginTokens': dbToken,
              },
            },
          );

          return (null);
        }
      }
    }

    return user;
  } finally {
    client.close();
  }
};

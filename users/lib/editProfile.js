import MongoClient from '../../libs/mongoClient';

const {
  COLL_USERS,
  DB_NAME,
} = process.env;

export default async (userId, appId, {
  username,
}) => {
  const $set = {
    'profile.username': `${username}`,
  };
  const client = await MongoClient.connect();

  try {
    const { matchedCount } = await client
      .db(DB_NAME)
      .collection(COLL_USERS)
      .updateOne({
        _id: userId,
        appIds: appId,
      }, {
        $set,
      });

    return !!matchedCount;
  } finally {
    client.close();
  }
};

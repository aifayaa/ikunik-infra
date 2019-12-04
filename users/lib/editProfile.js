import { MongoClient } from 'mongodb';

const {
  COLL_USERS,
  DB_NAME,
  MONGO_URL,
} = process.env;

export default async (userId, appId, {
  firstname,
  lastname,
}) => {
  const $set = {
    'profile.username': `${firstname} ${lastname}`,
  };
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });

  try {
    const { matchedCount } = await client
      .db(DB_NAME)
      .collection(COLL_USERS)
      .updateOne({
        _id: userId,
        appIds: { $elemMatch: { $eq: appId } },
      }, {
        $set,
      });

    return !!matchedCount;
  } finally {
    client.close();
  }
};

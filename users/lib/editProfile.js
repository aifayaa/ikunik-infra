import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export default async (userId, appId, {
  username,
}) => {
  const $set = {
    'profile.username': `${username}`,
  };
  const client = await MongoClient.connect();

  try {
    const { matchedCount } = await client
      .db()
      .collection(COLL_USERS)
      .updateOne({
        _id: userId,
        appId,
      }, {
        $set,
      });

    return !!matchedCount;
  } finally {
    client.close();
  }
};

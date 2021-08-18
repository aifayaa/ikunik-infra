import MongoClient from '../../libs/mongoClient';

const {
  COLL_USER_BADGES,
} = process.env;

export default async (userBadgeId, appId) => {
  const client = await MongoClient.connect();

  try {
    const userBadgeObj = await client
      .db()
      .collection(COLL_USER_BADGES)
      .findOne({
        _id: userBadgeId,
        appId,
      });

    return (userBadgeObj);
  } finally {
    client.close();
  }
};

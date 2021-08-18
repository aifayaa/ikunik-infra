import MongoClient from '../../libs/mongoClient';

const {
  COLL_USER_BADGES,
} = process.env;

export default async (appId) => {
  const client = await MongoClient.connect();

  try {
    const userBadges = await client
      .db()
      .collection(COLL_USER_BADGES)
      .find({
        appId,
      })
      .toArray();

    return (userBadges);
  } finally {
    client.close();
  }
};

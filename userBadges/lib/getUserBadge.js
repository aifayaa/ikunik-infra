import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_BADGES } = mongoCollections;

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

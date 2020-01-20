import MongoClient from '../../libs/mongoClient';

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  try {
    const profile = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_PROFILES)
      .findOne({
        UserId: userId,
        appIds: { $elemMatch: { $eq: appId } },
      });
    return profile;
  } finally {
    client.close();
  }
};

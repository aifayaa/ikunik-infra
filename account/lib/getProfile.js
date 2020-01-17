import MongoClient from '../../libs/mongoClient'

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  try {
    const profile = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_PROFILES)
      .findOne({
        UserId: userId,
        appIds: { $elemMatch: { $eq: appId } },
      }, { projection: { _id: 1 } });
    return profile && profile._id;
  } finally {
    client.close();
  }
};

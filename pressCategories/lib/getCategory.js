import MongoClient from '../../libs/mongoClient'

export default async (appId, catId) => {
  let client;
  try {
    client = await MongoClient.connect();
    return await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_PRESS_CATEGORIES)
      .findOne({
        _id: catId,
        appIds: { $elemMatch: { $eq: appId } },
      });
  } finally {
    client.close();
  }
};

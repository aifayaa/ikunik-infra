import MongoClient from '../../libs/mongoClient';

const {
  COLL_PRESS_CATEGORIES,
  DB_NAME,
} = process.env;

export default async (appId, catId) => {
  const client = await MongoClient.connect();
  try {
    return await client.db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .findOne({
        _id: catId,
        appIds: appId,
      });
  } finally {
    client.close();
  }
};

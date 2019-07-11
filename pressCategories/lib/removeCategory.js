import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PRESS_CATEGORIES,
} = process.env;

export default async (appId, categoryId) => {
  const client = await MongoClient.connect(MONGO_URL, {
    useNewUrlParser: true,
  });

  try {
    const result = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .deleteOne({
        _id: categoryId,
        appIds: { $elemMatch: { $eq: appId } },
      });
    return { result };
  } finally {
    client.close();
  }
};

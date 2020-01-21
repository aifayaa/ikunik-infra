import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
} = process.env;

export default async (appId, categoryId) => {
  const client = await MongoClient.connect();

  try {
    const resultDelete = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .deleteOne({
        _id: categoryId,
        appIds: { $elemMatch: { $eq: appId } },
      });

    const resultTrashed = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .updateMany(
        {
          categoryId,
          appIds: { $elemMatch: { $eq: appId } },
        },
        {
          $set: {
            trashed: true,
            categoryId: null,
          },
        },
      );
    return { resultDelete, resultTrashed };
  } finally {
    client.close();
  }
};

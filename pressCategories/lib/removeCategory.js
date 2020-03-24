import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
} = process.env;

export default async (appId, categoryId) => {
  const client = await MongoClient.connect();

  try {
    const collection = client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES);
    const bulk = collection.initializeOrderedBulkOp();
    const category = collection.findOne({
      _id: categoryId,
      appIds: appId,
    }, { projection: { order: true } });
    if (!category) throw new Error('category_not_found');

    bulk.find({
      _id: categoryId,
    }).removeOne();

    if (category.order) {
      bulk.find({
        appIds: appId,
        order: {
          $gt: category.order,
          $lt: 99,
          $exists: true,
        },
      }).update({ $inc: { order: -1 } });
    }


    const resultDelete = await bulk.execute();

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

import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  SAFE_ORDER_NUMBER,
} = process.env;

export default async (appId, categoryId) => {
  const client = await MongoClient.connect();

  try {
    const collection = client.db(DB_NAME).collection(COLL_PRESS_CATEGORIES);
    const bulk = collection.initializeOrderedBulkOp();
    const category = collection.findOne(
      {
        _id: categoryId,
        appIds: appId,
      },
      { projection: { order: true } },
    );
    if (!category) throw new Error('category_not_found');

    const childrenCategories = collection.find(
      {
        parentId: categoryId,
        appIds: appId,
      },
      { projection: { _id: true } },
    );
    if (childrenCategories) {
      throw new Error('category_has_children_categories');
    }

    bulk
      .find({
        _id: categoryId,
      })
      .removeOne();

    if (category.order) {
      /* ex delete element at 2nd position
         delete
           ||
           \/
        [1, 2 , 3, 4, 5]

        all values after position 2 must be decreased
        [1, 3=>2, 4=>3, 4=>3, 5=>4]
      */
      bulk
        .find({
          appIds: appId,
          order: {
            $gt: category.order,
            $lt: SAFE_ORDER_NUMBER, // do not touch order 999 documents
          },
        })
        .update({ $inc: { order: -1 } });
    }

    const resultDelete = await bulk.execute();

    const resultTrashed = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .updateMany(
        {
          categoryId,
          appIds: appId,
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

import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  SAFE_ORDER_NUMBER,
} = process.env;
const safeOrderNumber = Number.parseInt(SAFE_ORDER_NUMBER, 10);

export default async (appId, categoryId) => {
  const client = await MongoClient.connect();

  try {
    const collection = client.db(DB_NAME).collection(COLL_PRESS_CATEGORIES);
    const bulk = collection.initializeOrderedBulkOp();
    const category = await collection.findOne(
      {
        _id: categoryId,
        appId,
      },
      { projection: { order: true, parentId: true } },
    );
    if (!category) throw new Error('category_not_found');

    const childrenCategories = await collection
      .find(
        {
          parentId: categoryId,
          appId,
        },
        { projection: { _id: true } },
      )
      .toArray();
    if (childrenCategories.length > 0) {
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
          appId,
          parentId: category.parentId || null,
          order: {
            $gt: category.order,
            $lt: safeOrderNumber, // do not touch order 999 documents
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
          appId,
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

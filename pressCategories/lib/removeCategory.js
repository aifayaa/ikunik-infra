/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { SAFE_ORDER_NUMBER } = process.env;

const { COLL_PRESS_ARTICLES, COLL_PRESS_CATEGORIES } = mongoCollections;

const safeOrderNumber = Number.parseInt(SAFE_ORDER_NUMBER, 10);

export default async (appId, categoryId) => {
  const client = await MongoClient.connect();

  try {
    const collection = client.db().collection(COLL_PRESS_CATEGORIES);

    const previousCategoryValues = await collection.findOne(
      { _id: categoryId, appId },
      { projection: { order: 1, parentId: 1 } }
    );

    if (!previousCategoryValues) throw new Error('category_not_found');

    const { order, parentId } = previousCategoryValues;

    const currentCategoriesHasChildren = await collection.countDocuments({
      appId,
      parentId: categoryId,
    });

    if (currentCategoriesHasChildren) {
      throw new Error('category_has_children_categories');
    }

    const bulk = collection.initializeOrderedBulkOp();

    bulk.find({ _id: categoryId }).removeOne();

    if (order) {
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
          parentId: parentId || null,
          order: {
            $gt: order,
            $lt: safeOrderNumber, // do not touch order 999 documents
          },
        })
        .update({ $inc: { order: -1 } });
    }

    const resultDelete = await bulk.execute();

    const resultTrashed = await client
      .db()
      .collection(COLL_PRESS_ARTICLES)
      .updateMany(
        {
          appId,
          categoryId,
        },
        {
          $set: {
            trashed: true,
            categoryId: null,
          },
        }
      );
    return { resultDelete, resultTrashed };
  } finally {
    client.close();
  }
};

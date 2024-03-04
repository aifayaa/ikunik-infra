/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { reorderCategoriesIn } from './reorderCategory';

const { COLL_PRESS_ARTICLES, COLL_PRESS_CATEGORIES } = mongoCollections;

export default async (appId, categoryId) => {
  const client = await MongoClient.connect();

  try {
    const collection = client.db().collection(COLL_PRESS_CATEGORIES);

    const previousCategoryValues = await collection.findOne(
      { _id: categoryId, appId },
      { projection: { order: 1, parentId: 1 } }
    );

    if (!previousCategoryValues) throw new Error('category_not_found');

    const { parentId } = previousCategoryValues;

    const currentCategoriesHasChildren = await collection.countDocuments({
      appId,
      parentId: categoryId,
    });

    if (currentCategoriesHasChildren) {
      throw new Error('category_has_children_categories');
    }

    const resultDelete = collection.deleteOne({ _id: categoryId });

    await reorderCategoriesIn(appId, parentId);

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

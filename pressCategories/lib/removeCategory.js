/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import { reorderCategoriesIn } from './reorderCategory';

const { COLL_PRESS_ARTICLES, COLL_PRESS_CATEGORIES, COLL_PRESS_DRAFTS } =
  mongoCollections;

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

    const resultTrashed = await Promise.all([
      client
        .db()
        .collection(COLL_PRESS_ARTICLES)
        .updateMany(
          {
            appId,
            categoryId,
            categoriesId: { $exists: false },
          },
          {
            $set: {
              trashed: true,
              categoryId: null,
            },
          }
        ),
      client
        .db()
        .collection(COLL_PRESS_ARTICLES)
        .updateMany(
          {
            appId,
            categoriesId: categoryId,
            'categoriesId.1': { $exists: false },
          },
          {
            $set: {
              trashed: true,
              categoryId: null,
              categoriesId: [],
            },
          }
        ),
    ]);

    const articles = await client
      .db()
      .collection(COLL_PRESS_ARTICLES)
      .find(
        {
          appId,
          categoriesId: categoryId,
          'categoriesId.1': { $exists: true }, // Checks for arrays greater than 1
        },
        { projection: { _id: 1 } }
      )
      .toArray();

    if (articles.length > 0) {
      const articlesIds = articles.map(({ _id }) => _id);
      await client
        .db()
        .collection(COLL_PRESS_ARTICLES)
        .updateMany(
          {
            _id: { $in: articlesIds },
          },
          {
            $pull: {
              categoriesId: categoryId,
            },
          }
        );
      await client
        .db()
        .collection(COLL_PRESS_ARTICLES)
        .updateMany(
          {
            _id: { $in: articlesIds },
          },
          [
            {
              $set: {
                categoryId: { $arrayElemAt: ['$categoriesId', 0] },
              },
            },
          ]
        );
      const drafts = await client
        .db()
        .collection(COLL_PRESS_DRAFTS)
        .find(
          {
            appId,
            categoriesId: categoryId,
            'categoriesId.1': { $exists: true }, // Checks for arrays greater than 1
          },
          { projection: { _id: 1 } }
        )
        .toArray();
      const draftsIds = drafts.map(({ _id }) => _id);
      await client
        .db()
        .collection(COLL_PRESS_DRAFTS)
        .updateMany(
          {
            _id: { $in: draftsIds },
          },
          {
            $pull: {
              categoriesId: categoryId,
            },
          }
        );
      await client
        .db()
        .collection(COLL_PRESS_DRAFTS)
        .updateMany(
          {
            _id: { $in: draftsIds },
          },
          [
            {
              $set: {
                categoryId: { $arrayElemAt: ['$categoriesId', 0] },
              },
            },
          ]
        );
    }
    return { resultDelete, resultTrashed };
  } finally {
    client.close();
  }
};

/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_CATEGORIES } = mongoCollections;

function sortCallback(a, b) {
  return a.order - b.order;
}

export async function reorderCategoriesIn(appId, parentId) {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const collection = client.db().collection(COLL_PRESS_CATEGORIES);

    const remainingCategories = await collection
      .find({ appId, parentId }, { projection: { order: 1 } })
      .toArray();

    const sortedCategories = [...remainingCategories]
      .sort(sortCallback)
      .map(({ _id, order }, arrayId) => ({
        _id,
        order: arrayId + 1,
        oldOrder: order,
      }));

    const updates = sortedCategories
      .map((cat, arrayId) => {
        const newOrder = arrayId + 1;
        if (cat.oldOrder === newOrder) {
          return null;
        }

        return {
          updateOne: {
            filter: { _id: cat._id },
            update: { $set: { order: newOrder } },
          },
        };
      })
      .filter((x) => x !== null);

    const updatesCount = updates.length;
    if (updates.length > 0) {
      await collection.bulkWrite(updates, { ordered: false });
    }

    return updatesCount;
  } finally {
    client.close();
  }
}

export default async (appId, categoryId, inputOrder) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const collection = client.db().collection(COLL_PRESS_CATEGORIES);
    const targetCategory = await collection.findOne(
      { _id: categoryId, appId },
      { projection: { order: 1, parentId: 1 } }
    );

    if (!targetCategory) {
      throw new Error('category_not_found');
    }

    const remainingCategories = await collection
      .find(
        { appId, parentId: targetCategory.parentId, _id: { $ne: categoryId } },
        { projection: { order: 1 } }
      )
      .toArray();

    const sortedCategories = [...remainingCategories]
      .sort(sortCallback)
      .map(({ _id, order }, arrayId) => ({
        _id,
        order: arrayId + 1,
        oldOrder: order,
      }));

    let finalTargetOrder = targetCategory.order;
    targetCategory.oldOrder = targetCategory.order;
    targetCategory.order = inputOrder - 0.5;

    sortedCategories.push(targetCategory);
    sortedCategories.sort(sortCallback);

    const updates = sortedCategories
      .map((cat, arrayId) => {
        const newOrder = arrayId + 1;
        if (cat.oldOrder === newOrder) {
          return null;
        }

        if (cat._id === categoryId) {
          finalTargetOrder = newOrder;
        }

        return {
          updateOne: {
            filter: { _id: cat._id },
            update: { $set: { order: newOrder } },
          },
        };
      })
      .filter((x) => x !== null);

    const updatesCount = updates.length;
    if (updates.length > 0) {
      await collection.bulkWrite(updates, { ordered: false });
    }

    return {
      finalOrder: finalTargetOrder,
      updatesCount,
    };
  } finally {
    client.close();
  }
};

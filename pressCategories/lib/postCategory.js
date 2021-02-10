import MongoClient, { ObjectID } from '../../libs/mongoClient';
import isAvailable from './isAvailable';

const { COLL_PRESS_CATEGORIES, DB_NAME, SAFE_ORDER_NUMBER } = process.env;
const safeOrderNumber = Number.parseInt(SAFE_ORDER_NUMBER, 10);

export default async (
  appId,
  name,
  pathName,
  color,
  picture,
  order,
  hidden,
  parentId,
  action,
) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const checkAvailability = await isAvailable(client, appId, name, pathName);
    if (checkAvailability !== true) throw new Error(checkAvailability);

    /*
      defaultOrder is the last order
      total number of ordered categories + 1
    */
    const defaultOrder =
      (await client
        .db(DB_NAME)
        .collection(COLL_PRESS_CATEGORIES)
        .count({
          appId,
          /*
            SAFE_ORDER_NUMBER = 999 is used as a safe position for unordered categories
            mongodb sort null values on top, that's why all categories
            should have an order field.
          */
          order: { $ne: safeOrderNumber },
        })) + 1;

    if (defaultOrder >= safeOrderNumber) {
      throw new Error('max_category_reached');
    }

    /* Otherwise, insert the category to the database and return it */
    const category = {
      _id: new ObjectID().toString(),
      name,
      pathName,
      color,
      picture: picture.pop(),
      appId,
      createdAt: new Date(),
      hidden,
      parentId: null,
      action,
      // use default if order not valid
      order: Math.min(order || defaultOrder, defaultOrder),
    };

    if (parentId) {
      const parentCategory = await client
        .db(DB_NAME)
        .collection(COLL_PRESS_CATEGORIES)
        .findOne({ _id: parentId });
      if (!parentCategory) {
        throw new Error('no_parent_category_found');
      }
      if (parentCategory.parentId) {
        throw new Error('not_root_category');
      }

      // Default order is number of other children categories from a parent
      const defaultOrderChildCategory =
        (await client.db(DB_NAME).collection(COLL_PRESS_CATEGORIES).count({
          appId,
          parentId,
        })) + 1;

      if (defaultOrderChildCategory >= safeOrderNumber) {
        throw new Error('max_child_category_reached');
      }
      if (order > defaultOrderChildCategory) {
        throw new Error('press_service_order_superior_to_max_order');
      }
      category.order = Math.min(
        order || defaultOrderChildCategory,
        defaultOrderChildCategory,
      );
      category.parentId = parentId;
    }

    const bulk = client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .initializeOrderedBulkOp();
    if (!parentId) {
      /* ex inserting at 2nd position
      new
      ||
      \/
      [1, 2 , 3, 4, 5]

      all values after position 2 must be increased
      [1, n=>2, 2=>3, 3=>4, 4=>5, 5=>6]
      */
      bulk
        .find({
          appId,
          order: {
            $gte: category.order,
            $lt: safeOrderNumber,
          },
        })
        .update({ $inc: { order: 1 } });
    }


    bulk.insert(category);
    await bulk.execute();

    return { _id: category._id, ...category };
  } finally {
    client.close();
  }
};

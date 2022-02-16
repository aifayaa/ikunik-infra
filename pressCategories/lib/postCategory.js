import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import isAvailable from './isAvailable';

const { SAFE_ORDER_NUMBER } = process.env;
const { COLL_PRESS_CATEGORIES, COLL_USER_BADGES } = mongoCollections;
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
  badges,
  badgesAllow,
  action,
) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const collection = client.db().collection(COLL_PRESS_CATEGORIES);

    /* * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * DOING CHECKS : making sure operation is authorized
     *
     * * * * * * * * * * * * * * * * * * * * * * * * */

    /* Ensure category is unique : checking if any similar category already exists */
    const checkAvailability = await isAvailable(client, appId, name, pathName);
    if (checkAvailability !== true) throw new Error(checkAvailability);

    /* maximumOrderValue is the number of categories +1 */
    const maximumOrderValue =
      (await collection.countDocuments({
        appId,
        parentId: null,
        /*
          SAFE_ORDER_NUMBER = 999 is used as a safe position for unordered categories
          mongodb sort null values on top, that's why all categories
          should have an order field.
        */
        order: { $ne: safeOrderNumber },
      })) + 1;

    /* Checking we didn't exceed the maximum number of categories */
    if (maximumOrderValue >= safeOrderNumber) {
      throw new Error('max_category_reached');
    }

    /* Checking specified order does not exceed the maximum value */
    if (order > maximumOrderValue) {
      throw new Error('press_service_order_superior_to_max_order');
    }

    /* If a parentId is specified (category is a child), doing some checks on the parent */
    let maximumOrderValueForParentId = 0;
    if (parentId) {
      const parentCategory = await collection.findOne({ _id: parentId });

      /* Specified parentId was not found */
      if (!parentCategory) {
        throw new Error('no_parent_category_found');
      }

      /* For now we don't allow recursive categories, we stop at first level of child */
      if (parentCategory.parentId) {
        throw new Error('not_root_category');
      }

      /* Get the maximum order value for that parentId */
      maximumOrderValueForParentId =
        (await collection.countDocuments({
          appId,
          parentId,
        })) + 1;

      /* Also checking we didn't exceed the maximum number of child categories for that parent */
      if (maximumOrderValueForParentId >= safeOrderNumber) {
        throw new Error('max_child_category_reached');
      }

      /* Checking the specified value does not exceed the current maximum order value */
      if (order > maximumOrderValueForParentId) {
        throw new Error('press_service_order_superior_to_max_order');
      }
    }

    if (badges.length > 0) {
      const allPerms = await client.db().collection(COLL_USER_BADGES).find().toArray();
      const allPermsMap = allPerms.reduce((acc, perm) => {
        acc[perm._id] = perm;
        return (acc);
      }, {});

      badges = badges.map((p) => {
        const dbPerm = allPermsMap[p];
        if (!dbPerm) {
          throw new Error('invalid_permission');
        }

        return ({
          id: p,
        });
      });
    }

    /* * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * PROCESSING : updating database
     *
     * * * * * * * * * * * * * * * * * * * * * * * * */

    /* Prepare the category object for database insertion */
    const category = {
      _id: new ObjectID().toString(),
      action,
      appId,
      color,
      createdAt: new Date(),
      hidden,
      name,
      parentId: parentId || null,
      pathName,
      picture: picture.pop(),
      badges: {
        list: badges,
        allow: badgesAllow || 'any',
      },
    };

    const whichMaximumOrderValue = parentId ? maximumOrderValueForParentId : maximumOrderValue;
    category.order = Math.min(
      order || whichMaximumOrderValue,
      whichMaximumOrderValue,
    );

    /* Inserting into database */
    const bulk = collection.initializeOrderedBulkOp();

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
        parentId: category.parentId,
        order: {
          $gte: category.order,
          $lt: safeOrderNumber,
        },
      })
      .update({ $inc: { order: 1 } });
    bulk.insert(category);
    await bulk.execute();

    return { _id: category._id, ...category };
  } finally {
    client.close();
  }
};

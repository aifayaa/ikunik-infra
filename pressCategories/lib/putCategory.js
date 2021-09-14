import MongoClient from '../../libs/mongoClient';
import isAvailable from './isAvailable';

const { COLL_PRESS_CATEGORIES, COLL_USER_BADGES, DB_NAME, SAFE_ORDER_NUMBER } = process.env;
const safeOrderNumber = Number.parseInt(SAFE_ORDER_NUMBER, 10);

export default async (
  appId,
  categoryId,
  name,
  pathName,
  color,
  picture,
  order,
  hidden,
  parentId,
  badges,
  action,
) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const collection = client.db(DB_NAME).collection(COLL_PRESS_CATEGORIES);

    /* * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * DOING FETCHS : getting previous values & preparing variables
     *
     * * * * * * * * * * * * * * * * * * * * * * * * */

    const previousCategoryValues = await collection.findOne(
      { _id: categoryId, appId },
      { projection: { order: 1, parentId: 1 } },
    );
    const { order: previousOrder, parentId: previousParentId } = previousCategoryValues;
    const hasOrderChanged = previousOrder !== order;
    const hasParentIdChanged = previousParentId !== parentId;

    /* maximumOrderValue is the number of categories */
    const maximumOrderValue = (await collection.countDocuments({
      appId,
      parentId: previousParentId,
      order: { $ne: safeOrderNumber },
    }));

    /* * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * DOING CHECKS : making sure operation is authorized
     *
     * * * * * * * * * * * * * * * * * * * * * * * * */

    /* Ensure category is unique : checking if any similar category already exists */
    const checkAvailability = await isAvailable(
      client,
      appId,
      name,
      pathName,
      categoryId,
    );
    if (checkAvailability !== true) throw new Error(checkAvailability);

    /* If current category already has children, it cannot be set as a child */
    if (parentId) {
      const currentCategoriesHasChildren = await collection.countDocuments({
        appId,
        parentId: categoryId,
      });

      if (currentCategoriesHasChildren) {
        throw new Error('has_already_child_categories');
      }

      /* Cannot set itself as a parent */
      if (parentId === categoryId) {
        throw new Error('parent_can_not_be_same_category');
      }
    }

    /* Checking we didn't exceed the maximum number of categories */
    if (maximumOrderValue >= safeOrderNumber) {
      throw new Error('max_category_reached');
    }

    /* Checking specified order does not exceed the maximum value */
    if (order > maximumOrderValue) {
      throw new Error('press_service_order_superior_to_max_order');
    }

    /* Get the maximum order value for that parentId */
    const maximumOrderValueForParentId = (await collection.countDocuments({
      appId,
      parentId,
      order: { $ne: safeOrderNumber },
    })) + 1;

    if (hasParentIdChanged) {
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
      }

      /* Also checking we didn't exceed the maximum number of child categories for that parent */
      if (maximumOrderValueForParentId >= safeOrderNumber) {
        throw new Error('max_child_category_reached');
      }

      /* Checking the specified value does not exceed the current maximum order value */
      if (order > maximumOrderValueForParentId) {
        throw new Error('press_service_order_superior_to_max_order');
      }
    } else if (hasOrderChanged) {
      /*
        In case we are trying to move a 999 order category
        and there is already 998 ordered categories
      */
      if (previousOrder === safeOrderNumber) {
        if (maximumOrderValue >= safeOrderNumber) {
          throw new Error('max_ordered_category_reached');
        }
      }
    }

    if (badges && badges.length > 0) {
      const allBadges = await client.db(DB_NAME).collection(COLL_USER_BADGES).find().toArray();
      const allBadgesMap = allBadges.reduce((acc, badge) => {
        acc[badge._id] = badge;
        return (acc);
      }, {});

      badges = badges.map((p) => {
        const dbPerm = allBadgesMap[p];
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
      action,
      color: color || null,
      hidden,
      name,
      parentId: parentId || null,
      pathName,
      badges: {
        list: badges,
        allow: 'any',
      },
    };

    if (picture && picture.length) {
      category.picture = picture.pop();
    }

    if (order) {
      const whichMaximumOrderValue = parentId ? maximumOrderValueForParentId : maximumOrderValue;
      category.order = Math.min(
        order || whichMaximumOrderValue,
        whichMaximumOrderValue,
      );
    }

    /* Inserting into database */
    const bulk = collection.initializeOrderedBulkOp();

    /* If parent category has changed */
    if (hasParentIdChanged) {
      /* Update previous subset order */
      bulk
        .find({
          appId,
          parentId: previousParentId,
          order: {
            $gte: previousOrder,
            $lt: safeOrderNumber,
          },
        })
        .update({ $inc: { order: -1 } });

      /* And update next subset order */
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

    /* Otherwise if parent has not changed but order changed */
    } else if (hasOrderChanged) {
      /* If order was increased */
      if (category.order > previousOrder) {
        /* ex move 2 to position 4
               _______
              |       |
              |       \/
          [1, 2 , 3, 4, 5]

          all values between old position and new position must be decreased
          [1, 3=>2, 4=>3, 2=>4, 5]
        */
        bulk
          .find({
            appId,
            parentId: category.parentId,
            order: {
              $lte: category.order,
              $gt: previousOrder,
              $ne: safeOrderNumber,
            },
          })
          .update({ $inc: { order: -1 } });

      /* Otherwise if order was decreased */
      } else if (category.order < previousOrder) {
        /* ex move 4 to position 2
             ________
            |        |
            \/       |
          [1, 2 , 3, 4, 5]

          all values between old position and new position must be increased
          [1, 4=>2, 2=>3, 3=>4, 5]
        */
        bulk
          .find({
            appId,
            parentId: category.parentId,
            order: {
              $gte: category.order,
              $lt: previousOrder,
              $ne: safeOrderNumber,
            },
          })
          .update({ $inc: { order: 1 } });
      }
    }

    bulk
      .find({
        _id: categoryId,
        appId,
      })
      .updateOne({ $set: category });

    const { nMatched } = await bulk.execute();

    return !!nMatched;
  } finally {
    client.close();
  }
};

/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import isAvailable from './isAvailable';
import notifyAdminsForRSSFeedUrlChange from './notifyAdminsForRSSFeedUrlChange.ts';
import reorderCategory, { reorderCategoriesIn } from './reorderCategory';

const { COLL_PRESS_CATEGORIES, COLL_USER_BADGES } = mongoCollections;

export default async ({
  action,
  actionV2,
  appId,
  badges,
  badgesAllow,
  categoryId,
  color,
  forcedAuthor,
  hidden,
  isEvent,
  name,
  order,
  parentId,
  pathName,
  picture,
  reversedFlow,
  reversedFlowStart,
  rssFeedUrl,
}) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const collection = client.db().collection(COLL_PRESS_CATEGORIES);

    /* * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * DOING FETCHS : getting previous values & preparing variables
     *
     * * * * * * * * * * * * * * * * * * * * * * * * */

    const previousCategoryValues = await collection.findOne(
      { _id: categoryId, appId },
      { projection: { order: 1, parentId: 1 } }
    );
    const { order: previousOrder, parentId: previousParentId } =
      previousCategoryValues;
    const hasOrderChanged = order !== null && previousOrder !== order;
    const hasParentIdChanged = previousParentId !== parentId;

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
      categoryId
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
    }

    if (badges.length > 0) {
      const allBadges = await client
        .db()
        .collection(COLL_USER_BADGES)
        .find()
        .toArray();
      const allBadgesMap = allBadges.reduce((acc, badge) => {
        acc[badge._id] = badge;
        return acc;
      }, {});

      badges = badges.map((p) => {
        const dbPerm = allBadgesMap[p];
        if (!dbPerm) {
          throw new Error('invalid_permission');
        }

        return {
          id: p,
        };
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
      action_v2: actionV2,
      hidden,
      isEvent,
      name,
      parentId: parentId || null,
      pathName,
      badges: {
        list: badges,
        allow: badgesAllow || 'any',
      },
    };

    if (color) category.color = color;
    if (rssFeedUrl !== null) category.rssFeedUrl = rssFeedUrl;
    if (forcedAuthor !== null) category.forcedAuthor = forcedAuthor;
    if (reversedFlow !== null) category.reversedFlow = reversedFlow;
    if (reversedFlowStart !== null)
      category.reversedFlowStart = reversedFlowStart;

    if (picture && picture.length) {
      category.picture = picture.pop();
    }

    await collection.updateOne(
      {
        _id: categoryId,
        appId,
      },
      { $set: category }
    );

    if (hasParentIdChanged) {
      await reorderCategory(appId, categoryId, 0xffffffff);
      await reorderCategoriesIn(appId, previousParentId);
    } else if (hasOrderChanged) {
      await reorderCategory(appId, categoryId, order);
    }

    if (
      rssFeedUrl !== null &&
      !previousCategoryValues.rssFeedUrl !== !rssFeedUrl &&
      previousCategoryValues.rssFeedUrl !== rssFeedUrl
    ) {
      await notifyAdminsForRSSFeedUrlChange(appId, categoryId, rssFeedUrl);
    }

    return { _id: categoryId, ...category };
  } finally {
    client.close();
  }
};

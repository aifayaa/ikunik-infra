/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import isAvailable from './isAvailable';
import reorderCategory from './reorderCategory';
import notifyAdminsForRSSFeedUrlChange from './notifyAdminsForRSSFeedUrlChange.ts';

const { COLL_PRESS_CATEGORIES, COLL_USER_BADGES } = mongoCollections;

export default async ({
  action,
  actionV2,
  appId,
  badges,
  badgesAllow,
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
     * DOING CHECKS : making sure operation is authorized
     *
     * * * * * * * * * * * * * * * * * * * * * * * * */

    /* Ensure category is unique : checking if any similar category already exists */
    const checkAvailability = await isAvailable(client, appId, name, pathName);
    if (checkAvailability !== true) throw new Error(checkAvailability);

    /* If a parentId is specified (category is a child), doing some checks on the parent */
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

    if (badges.length > 0) {
      const allPerms = await client
        .db()
        .collection(COLL_USER_BADGES)
        .find()
        .toArray();
      const allPermsMap = allPerms.reduce((acc, perm) => {
        acc[perm._id] = perm;
        return acc;
      }, {});

      badges = badges.map((p) => {
        const dbPerm = allPermsMap[p];
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
      _id: new ObjectID().toString(),
      action_v2: actionV2,
      action,
      appId,
      color,
      createdAt: new Date(),
      hidden,
      isEvent,
      name,
      parentId: parentId || null,
      pathName,
      picture: picture.pop(),
      badges: {
        list: badges,
        allow: badgesAllow || 'any',
      },
      reversedFlow,
      reversedFlowStart,
      rssFeedUrl,
    };

    if (forcedAuthor !== null) {
      category.forcedAuthor = forcedAuthor;
    }

    category.order = order || 1;

    await collection.insertOne(category);

    await reorderCategory(appId, category._id, order);

    if (rssFeedUrl) {
      await notifyAdminsForRSSFeedUrlChange(appId, category._id, rssFeedUrl);
    }

    return { _id: category._id, ...category };
  } finally {
    client.close();
  }
};

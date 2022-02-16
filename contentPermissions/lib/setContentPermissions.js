import isEqual from 'lodash/isEqual';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_CONTENT_PERMISSIONS } = mongoCollections;

export const setContentPermissions = async (
  appId,
  userId,
  contentId,
  contentCollection,
  options = {},
) => {
  const {
    expiresAt = null,
    permissions = { all: true },
  } = options;

  const findQuery = {
    contentCollection,
    contentId,
    userId,
  };
  const insertData = {
    contentCollection,
    contentId,
    createdAt: new Date(),
    expiresAt,
    permissions,
    userId,
  };

  const client = await MongoClient.connect();

  try {
    const contentPermissions = await client
      .db()
      .collection(COLL_CONTENT_PERMISSIONS)
      .findOne(findQuery);

    if (!contentPermissions) {
      return await client
        .db()
        .collection(COLL_CONTENT_PERMISSIONS)
        .insertOne(insertData);
    }

    const update = { $set: {} };

    [
      'expiresAt',
      'permissions',
    ].forEach((key) => {
      if (!isEqual(contentPermissions[key], options[key])) {
        update.$set[key] = { ...contentPermissions[key], ...options[key] };
      }
    });

    if (Object.keys(update.$set).length) {
      return await client
        .db()
        .collection(COLL_CONTENT_PERMISSIONS)
        .updateOne(findQuery, update);
    }

    return insertData;
  } finally {
    client.close();
  }
};

import isEqual from 'lodash/isEqual';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_CONTENT_PERMISSIONS } = mongoCollections;

export const setContentPermissions = async (
  appId,
  userId,
  deviceId,
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
  };
  const insertData = {
    contentCollection,
    contentId,
    createdAt: new Date(),
    expiresAt,
    permissions,
    userId,
    deviceId,
  };
  if (userId && deviceId) {
    findQuery.$or = [
      { userId },
      { deviceId, userId: null },
    ];
  } else if (userId) {
    findQuery.userId = userId;
  } else if (deviceId) {
    findQuery.deviceId = deviceId;
    findQuery.userId = null;
  } else {
    throw new Error('missing_userid_and_deviceid');
  }

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
        .updateOne({ _id: contentPermissions._id }, update);
    }

    return insertData;
  } finally {
    client.close();
  }
};

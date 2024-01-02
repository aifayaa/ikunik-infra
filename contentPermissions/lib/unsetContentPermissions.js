import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_CONTENT_PERMISSIONS } = mongoCollections;

export const unsetContentPermissions = async (
  appId,
  userId,
  deviceId,
  contentId,
  contentCollection,
) => {
  const findQuery = {
    contentCollection,
    contentId,
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
      return;
    }

    const update = { $set: {
      expiresAt: new Date(),
    } };

    await client
      .db()
      .collection(COLL_CONTENT_PERMISSIONS)
      .updateOne({ _id: contentPermissions._id }, update);
  } finally {
    client.close();
  }
};

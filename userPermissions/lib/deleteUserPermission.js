import MongoClient from '../../libs/mongoClient';

const {
  COLL_USERS,
  COLL_PRESS_CATEGORIES,
  COLL_USER_PERMISSIONS,
} = process.env;

export default async (userPermissionId, appId) => {
  const client = await MongoClient.connect();

  try {
    const userPermObj = await client
      .db()
      .collection(COLL_USER_PERMISSIONS)
      .findOne({
        _id: userPermissionId,
        appId,
      });

    if (!userPermObj) {
      throw new Error('content_not_found');
    }

    await client
      .db()
      .collection(COLL_USER_PERMISSIONS)
      .deleteOne({
        _id: userPermissionId,
        appId,
      });

    await client.db().collection(COLL_USERS).updateMany(
      { appId, 'permissions.id': userPermObj._id },
      { $pull: { permissions: {
        id: userPermObj._id,
      } } },
    );
    await client.db().collection(COLL_PRESS_CATEGORIES).updateMany(
      { appId, 'permissions.list.id': userPermObj._id },
      { $pull: { 'permissions.list': {
        id: userPermObj._id,
      } } },
    );
  } finally {
    client.close();
  }
};

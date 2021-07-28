import MongoClient from '../../libs/mongoClient';

const {
  COLL_USERS,
  COLL_USER_PERMISSIONS,
} = process.env;

export default async (
  userPermissionId,
  appId,
  { action = 'add', userId },
) => {
  const client = await MongoClient.connect();

  try {
    if (action !== 'add' && action !== 'remove') {
      action = 'add';
    }

    if (action === 'add') {
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

      await client.db().collection(COLL_USERS).updateOne(
        { _id: userId, appId },
        { $addToSet: { permissions: {
          id: userPermObj._id,
          color: userPermObj.color,
          name: userPermObj.name,
        } } },
      );
    } else if (action === 'remove') {
      await client.db().collection(COLL_USERS).updateOne(
        { _id: userId, appId },
        { $pull: { permissions: {
          id: userPermissionId,
        } } },
      );
    }

    return ({ success: true });
  } finally {
    client.close();
  }
};

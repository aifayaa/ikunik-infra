import MongoClient from '../../libs/mongoClient';

const {
  COLL_USER_PERMISSIONS,
} = process.env;

export default async (userPermissionId, appId, {
  name,
  description,
  color,
}) => {
  const client = await MongoClient.connect();

  try {
    if (!name) throw new Error('missing_user_permission_name');
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

    if (userPermObj.name !== name) {
      const existingObj = await client
        .db()
        .collection(COLL_USER_PERMISSIONS)
        .findOne({ appId, name });

      if (existingObj) {
        throw new Error('duplicate_user_permission');
      }
    }

    const $set = {
      name,
      updatedAt: new Date(),
    };
    if (description !== undefined) {
      $set.description = description;
    }
    if (color !== undefined) {
      $set.color = color;
    }

    await client
      .db()
      .collection(COLL_USER_PERMISSIONS)
      .updateOne({
        _id: userPermissionId,
        appId,
      }, { $set });

    return ({ ...userPermObj, ...$set });
  } finally {
    client.close();
  }
};

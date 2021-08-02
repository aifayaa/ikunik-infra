import MongoClient, { ObjectID } from '../../libs/mongoClient';

const {
  COLL_USER_PERMISSIONS,
} = process.env;

export default async (userId, appId, {
  name,
  description = '',
  color = '#FFFFFF',
}) => {
  const client = await MongoClient.connect();

  try {
    if (!name) throw new Error('missing_user_permission_name');

    const existingObj = await client
      .db()
      .collection(COLL_USER_PERMISSIONS)
      .findOne({ appId, name });

    if (existingObj) {
      throw new Error('duplicate_user_permission');
    }

    const userPermObj = {
      _id: new ObjectID().toString(),
      appId,
      createdAt: new Date(),
      authorId: userId,
      name,
      description,
      color,
    };

    await client
      .db()
      .collection(COLL_USER_PERMISSIONS)
      .insertOne(userPermObj);

    return (userPermObj);
  } finally {
    client.close();
  }
};

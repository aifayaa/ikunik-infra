import MongoClient from '../../libs/mongoClient';

const {
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

    return (userPermObj);
  } finally {
    client.close();
  }
};

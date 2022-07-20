import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_CONTENT_PERMISSIONS } = mongoCollections;

export const unsetContentPermissions = async (
  appId,
  userId,
  contentId,
  contentCollection,
) => {
  const findQuery = {
    contentCollection,
    contentId,
    userId,
  };

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
      .updateOne(findQuery, update);
  } finally {
    client.close();
  }
};

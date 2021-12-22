import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (appId, havePerms) => {
  const client = await MongoClient.connect();
  const projection = {
    name: 1,
    protocol: 1,
  };

  if (havePerms) projection.key = 1;

  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne(
        { _id: appId },
        { projection },
      );

    if (!app) {
      return false;
    }

    return app;
  } finally {
    client.close();
  }
};

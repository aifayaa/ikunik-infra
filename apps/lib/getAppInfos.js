import MongoClient from '../../libs/mongoClient';

const { DB_NAME, COLL_APPS } = process.env;

export default async (appId, havePerms) => {
  const client = await MongoClient.connect();
  const projection = {
    name: 1,
    protocol: 1,
  };

  if (havePerms) projection.key = 1;

  try {
    const app = await client
      .db(DB_NAME)
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

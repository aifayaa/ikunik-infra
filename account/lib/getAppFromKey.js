import MongoClient from '../../libs/mongoClient';

export default async (appKey) => {
  const { DB_NAME, COLL_APPS, APP_NAME_DEFAULT } = process.env;
  const client = await MongoClient.connect();
  try {
    const app = await client
      .db(DB_NAME)
      .collection(COLL_APPS)
      .findOne(
        appKey ? { key: appKey } : { name: APP_NAME_DEFAULT },
        { projection: { key: 0 } },
      );
    if (!app) throw new Error('app_not_found');
    return app;
  } finally {
    client.close();
  }
};

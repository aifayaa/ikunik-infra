import { MongoClient } from 'mongodb';

export default async (appKey) => {
  const { MONGO_URL, DB_NAME, COLL_APPS, APP_NAME_DEFAULT } = process.env;
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
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

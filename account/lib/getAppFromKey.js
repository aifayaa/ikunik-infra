import MongoClient from '../../libs/mongoClient';

const {
  APP_NAME_DEFAULT,
  COLL_APPS,
  DB_NAME,
} = process.env;

export default async (appKey) => {
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

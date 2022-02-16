import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  APP_NAME_DEFAULT,
} = process.env;

const {
  COLL_APPS,
} = mongoCollections;

export default async (appKey) => {
  const client = await MongoClient.connect();
  try {
    const app = await client
      .db()
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

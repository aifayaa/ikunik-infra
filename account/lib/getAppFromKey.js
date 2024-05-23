/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { APP_API_KEY_DEFAULT } = process.env;

const { COLL_APPS } = mongoCollections;

export default async (appKey) => {
  const client = await MongoClient.connect();
  try {
    const query = {};

    if (appKey) {
      if (appKey.substr(0, 6) === 'appId:') {
        query._id = appKey.substr(6);
      } else {
        query.key = appKey;
      }
    } else {
      query.key = APP_API_KEY_DEFAULT;
    }

    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne(query, {
        projection: { key: 0 },
      });
    if (!app) throw new Error('app_not_found');
    return app;
  } finally {
    client.close();
  }
};

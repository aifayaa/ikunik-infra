/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { APP_NAME_DEFAULT } = process.env;

const { COLL_APPS } = mongoCollections;

export default async (appName) => {
  const client = await MongoClient.connect();
  const name = appName || APP_NAME_DEFAULT;

  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne(
        { name },
        {
          projection: {
            _id: 1,
            'builds.android.packageId': true,
            'builds.android.name': true,
            'builds.ios.iosAppId': true,
            'builds.ios.name': true,
            'credentials.facebook.appId': true,
          },
        }
      );
    if (!app) {
      throw new Error('app_not_found');
    }
    return app;
  } finally {
    client.close();
  }
};

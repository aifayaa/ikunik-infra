/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne(
        {
          _id: appId,
        },
        {
          projection: {
            icon: 1, // Not just builds anymore...
            name: 1,
            'builds.ios.name': 1,
            'builds.ios.iosAppId': 1,
            'builds.ios.packageId': 1,
            'builds.ios.platform': 1,
            'builds.ios.ready': 1,
            'builds.ios.deployed': 1,
            'builds.android.name': 1,
            'builds.android.packageId': 1,
            'builds.android.platform': 1,
            'builds.android.ready': 1,
            'builds.android.deployed': 1,
          },
        }
      );

    if (!app) {
      return false;
    }

    return app;
  } finally {
    client.close();
  }
};

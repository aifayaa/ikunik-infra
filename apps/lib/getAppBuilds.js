import MongoClient from '../../libs/mongoClient';

const {
  COLL_APPS,
  DB_NAME,
} = process.env;

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const app = await client
      .db(DB_NAME)
      .collection(COLL_APPS)
      .findOne(
        {
          _id: appId,
        },
        {
          projection: {
            'builds.ios.iosAppId': 1,
            'builds.ios.packageId': 1,
            'builds.ios.platform': 1,
            'builds.android.packageId': 1,
            'builds.android.platform': 1,
          },
        },
      );

    if (!app) {
      return false;
    }

    return app;
  } finally {
    client.close();
  }
};

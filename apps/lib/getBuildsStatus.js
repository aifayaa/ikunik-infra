/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const buildStatus = await client
      .db()
      .collection(COLL_APPS)
      .findOne(
        {
          _id: appId,
        },
        {
          projection: {
            'builds.ios.status': 1,
            'builds.ios.info': 1,
            'builds.android.status': 1,
            'builds.android.info': 1,
          },
        }
      );

    if (!buildStatus) {
      return { app: false };
    }

    return buildStatus;
  } finally {
    client.close();
  }
};

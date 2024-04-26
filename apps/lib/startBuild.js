/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

// temp build status list
// {
//   "FRESH": 0,
//   "WAITING": 1,
//   "BUILDING": 2,
//   "BUILT": 3,
//   "DEPLOYING": 4,
//   "DEPLOYED": 5,
//   "CANCELED": 6,
//   "FAILED_TO_BUILD": 11,
//   "FAILED_TO_DEPLOY": 12,
//   "BUILD_REQUESTED": 15
// }

export default async (appId) => {
  const client = await MongoClient.connect();
  const db = client.db();
  try {
    const app = await db.collection(COLL_APPS).findOne(
      { _id: appId },
      {
        projection: {
          setup: 1,
          builds: 1,
        },
      }
    );

    if (!app || !app.setup || (app.setup && app.setup.status === 'done')) {
      return { buildsStarted: false };
    }

    const now = new Date();
    const authPrevStatus = [0, 1];
    const update = {};

    if (
      app.builds &&
      app.builds.android &&
      !app.builds.android.ready &&
      authPrevStatus.includes(app.builds.android.status)
    ) {
      update['builds.android'] = {
        ...app.builds.android,
        status: 15,
        info: {
          name: 'Build started',
          date: now,
        },
      };
    }

    if (
      app.builds &&
      app.builds.ios &&
      !app.builds.ios.ready &&
      authPrevStatus.includes(app.builds.ios.status)
    ) {
      update['builds.ios'] = {
        ...app.builds.ios,
        status: 15,
        info: {
          name: 'Build started',
          date: now,
        },
      };
    }

    if (Object.keys(update).length > 0) {
      await db
        .collection(COLL_APPS)
        .updateOne({ _id: appId }, { $set: update });
    } else {
      return {
        buildsStarted: false,
        builds: {
          android: app.builds.android.status || undefined,
          ios: app.builds.ios.status || undefined,
        },
      };
    }

    const updatedApp = await db.collection(COLL_APPS).findOne({ _id: appId });

    return {
      buildsStarted: true,
      builds: {
        android:
          updatedApp.builds &&
          updatedApp.builds.android &&
          updatedApp.builds.android.status
            ? updatedApp.builds.android.status
            : undefined,
        ios:
          updatedApp.builds &&
          updatedApp.builds.ios &&
          updatedApp.builds.ios.status
            ? updatedApp.builds.ios.status
            : undefined,
      },
    };
  } finally {
    client.close();
  }
};

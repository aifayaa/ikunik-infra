/* eslint-disable import/no-relative-packages */
import Random from '../../libs/account_utils/random';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils';
import { filterAppPrivateFields } from './appsUtils';

const { COLL_APPS } = mongoCollections;

export default async (appId, update) => {
  const client = await MongoClient.connect();
  try {
    const db = client.db();
    const app = await db.collection(COLL_APPS).findOne({ _id: appId });
    if (!app) throw new Error('app_not_found');

    // If the application has already be built or setup, it cannot be modified
    if (app.builds || app.setup) {
      throw new Error('cannot_modify_app');
    }

    // Update the application name
    const $set = {};
    if (update.name) {
      $set.name = update.name;
    }
    if (update.androidName) {
      if (!objGet(app, ['builds', 'android'])) {
        const packageIdSuffix = Random.randomString(
          10,
          'abcdefghijklmnopqrstuvwxyz0123456789'
        );
        const packageId = `com.crowdaa.app.${packageIdSuffix}`;

        $set['builds.android.packageId'] = packageId;
        $set['builds.android.platform'] = 'android';
        $set['builds.android.repository'] = 'crowdaa_press_yui';
        $set['builds.android.name'] = update.androidName;
      } else if (
        !app.builds.android.ready &&
        (!app.builds.android.pipeline ||
          app.builds.android.pipeline.status === 'error')
      ) {
        $set['builds.android.name'] = update.androidName;
      }
    }
    if (update.iosName) {
      if (!objGet(app, ['builds', 'ios'])) {
        const packageIdSuffix = Random.randomString(
          10,
          'abcdefghijklmnopqrstuvwxyz0123456789'
        );
        const packageId = `com.crowdaa.app.${packageIdSuffix}`;

        $set['builds.ios.packageId'] = packageId;
        $set['builds.ios.platform'] = 'ios';
        $set['builds.ios.repository'] = 'crowdaa_press_yui';
      } else if (
        !app.builds.ios.ready &&
        !app.appleAccounts &&
        (!app.builds.ios.pipeline || app.builds.ios.pipeline.status === 'error')
      ) {
        $set['builds.ios.name'] = update.iosName;
      }
    }
    const commandRes = await db
      .collection(COLL_APPS)
      .findOneAndUpdate({ _id: appId }, { $set });

    const { ok, value: appUpdated } = commandRes;

    if (ok !== 1) {
      throw new Error('update_failed');
    }

    return filterAppPrivateFields(appUpdated);
  } finally {
    client.close();
  }
};

/* eslint-disable import/no-relative-packages */
import Random from '../../libs/account_utils/random';
import { CrowdaaException } from '../../libs/httpResponses/crowdaaException';
import {
  CANNOT_CHANGE_ANDROID_NAME,
  CANNOT_CHANGE_IOS_NAME,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils';
import { getAppLockedFields } from './appsUtils';

const { COLL_APPS } = mongoCollections;

export default async (appId, update) => {
  const client = await MongoClient.connect();
  try {
    const db = client.db();
    const app = await db.collection(COLL_APPS).findOne({ _id: appId });
    if (!app) throw new Error('app_not_found');

    const lockedFields = getAppLockedFields(app);
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
      } else if (!lockedFields.androidName) {
        $set['builds.android.name'] = update.androidName;
      } else {
        throw new CrowdaaException(
          ERROR_TYPE_NOT_ALLOWED,
          CANNOT_CHANGE_ANDROID_NAME,
          `Cannot change the Android name for app ${app.name}`
        );
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
      } else if (!lockedFields.iosName) {
        $set['builds.ios.name'] = update.iosName;
      } else {
        throw new CrowdaaException(
          ERROR_TYPE_NOT_ALLOWED,
          CANNOT_CHANGE_IOS_NAME,
          `Cannot change the iOS name for app ${app.name}`
        );
      }
    }

    await db.collection(COLL_APPS).findOneAndUpdate({ _id: appId }, { $set });

    const updatedApp = await db.collection(COLL_APPS).findOne({ _id: appId });

    return updatedApp;
  } finally {
    client.close();
  }
};

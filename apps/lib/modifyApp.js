/* eslint-disable import/no-relative-packages */
import { CrowdaaException } from '../../libs/httpResponses/crowdaaException';
import {
  CANNOT_CHANGE_ANDROID_NAME,
  CANNOT_CHANGE_IOS_NAME,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils';
import { getAppDefaultBuildFields, getAppLockedFields } from './appsUtils';

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
        $set['builds.android'] = getAppDefaultBuildFields(
          update.androidName,
          'android'
        );
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
        $set['builds.ios'] = getAppDefaultBuildFields(update.iosName, 'ios');
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

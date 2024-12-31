/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  CANNOT_CHANGE_ANDROID_NAME_CODE,
  CANNOT_CHANGE_IOS_NAME_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes.ts';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet, objSet } from '../../libs/utils';
import { getAppDefaultBuildFields, getAppLockedFields } from './appsUtils.ts';

const { COLL_APPS, COLL_PICTURES, COLL_VIDEOS } = mongoCollections;

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

    if (
      update.iosDescription ||
      update.iosAuthor ||
      update.iosEmail ||
      update.iosName
    ) {
      if (!objGet(app, ['builds', 'ios'])) {
        const fields = getAppDefaultBuildFields(app.name, 'ios');
        Object.keys(fields).forEach((field) => {
          $set[`builds.ios.${field}`] = fields[field];
          objSet(app, ['builds', 'ios', field], fields[field]);
        });
      }
    }

    if (
      update.androidDescription ||
      update.androidAuthor ||
      update.androidEmail ||
      update.androidName
    ) {
      if (!objGet(app, ['builds', 'android'])) {
        const fields = getAppDefaultBuildFields(app.name, 'android');
        Object.keys(fields).forEach((field) => {
          $set[`builds.android.${field}`] = fields[field];
          objSet(app, ['builds', 'android', field], fields[field]);
        });
      }
    }

    if (update.androidName) {
      if (!lockedFields.androidName) {
        $set['builds.android.name'] = update.androidName;
      } else {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          CANNOT_CHANGE_ANDROID_NAME_CODE,
          `Cannot change the Android name for app ${app.name}`
        );
      }
    }
    if (update.iosName) {
      if (!lockedFields.iosName) {
        $set['builds.ios.name'] = update.iosName;
      } else {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          CANNOT_CHANGE_IOS_NAME_CODE,
          `Cannot change the iOS name for app ${app.name}`
        );
      }
    }

    if (update.iosAuthor) {
      $set['builds.ios.author'] = update.iosAuthor;
    }
    if (update.iosEmail) {
      $set['builds.ios.email'] = update.iosEmail;
    }
    if (update.iosDescription) {
      $set['builds.ios.description'] = update.iosDescription;
    }

    if (update.androidAuthor) {
      $set['builds.android.author'] = update.androidAuthor;
    }
    if (update.androidEmail) {
      $set['builds.android.email'] = update.androidEmail;
    }
    if (update.androidDescription) {
      $set['builds.android.description'] = update.androidDescription;
    }
    if (update.androidSplashScreenBackgroundColor) {
      $set['builds.android.splashScreenBackgroundColor'] =
        update.androidSplashScreenBackgroundColor;
    }
    if (update.iconId) {
      const picture = await db
        .collection(COLL_PICTURES)
        .findOne({ _id: update.iconId });
      if (picture) {
        const haveUrl =
          picture.thumbUrl ||
          picture.mediumUrl ||
          picture.largeUrl ||
          picture.pictureUrl;
        if (haveUrl) {
          $set['icon._id'] = update.iconId;
          $set['icon.thumbUrl'] = picture.thumbUrl;
          $set['icon.mediumUrl'] = picture.mediumUrl;
          $set['icon.largeUrl'] = picture.largeUrl;
          $set['icon.pictureUrl'] = picture.pictureUrl;
        }
      }
    }
    if (update.mmfId) {
      $set['credentials.mmf'] = {
        id: update.mmfId,
      };
      $set['settings.press.env.merchMMFUrl'] =
        `https://mpodx.shop/?entry=cat&platform=crowdaa&cart=1&mf_uuid=${update.mmfId}`;
    }
    if (update.startupVideo) {
      if (update.startupVideo.delete) {
        await db.collection(COLL_APPS).updateOne(
          { _id: appId },
          {
            $unset: {
              'settings.startupVideoId': '',
              'settings.press.env.startupVideoUrl': '',
              'settings.press.env.startupVideoMode': '',
            },
          }
        );
      } else {
        const video = await db
          .collection(COLL_VIDEOS)
          .findOne({ _id: update.startupVideo.id, appId });

        if (video) {
          $set['settings.startupVideoId'] = update.startupVideo.id;
          $set['settings.press.env.startupVideoUrl'] = update.startupVideo.url;
          $set['settings.press.env.startupVideoMode'] =
            update.startupVideo.mode;
        }
      }
    }

    if (Object.keys($set).length > 0) {
      await db.collection(COLL_APPS).updateOne({ _id: appId }, { $set });
    }

    const updatedApp = await db.collection(COLL_APPS).findOne({ _id: appId });

    return updatedApp;
  } finally {
    client.close();
  }
};

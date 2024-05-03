/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

const { S3_APPS_RESSOURCES, S3_APPS_PUBLIC_RESSOURCES } = process.env;

const { COLL_APPS } = mongoCollections;

function objSet(obj, keys, value) {
  const last = keys.pop();
  keys.forEach((key) => {
    if (!obj[key]) {
      obj[key] = {};
    }
    obj = obj[key];
  });
  obj[last] = value;
}

export const resourcesFormats = {
  ios: {
    appIcon: {
      bucket: S3_APPS_RESSOURCES,
      fullPath: 'ios/icon.png',
    },
    splashScreen: {
      bucket: S3_APPS_RESSOURCES,
      fullPath: 'ios/splash.png',
    },
  },
  android: {
    appIcon: {
      bucket: S3_APPS_RESSOURCES,
      fullPath: 'android/icon.png',
    },
    splashScreen: {
      bucket: S3_APPS_RESSOURCES,
      fullPath: 'android/splash.png',
    },
    appIconBackgroundLayer: {
      bucket: S3_APPS_RESSOURCES,
      fullPath: 'android/android/icon-background.png',
    },
    appIconForegroundLayer: {
      bucket: S3_APPS_RESSOURCES,
      fullPath: 'android/android/icon-foreground.png',
    },
  },
  public: {
    appIcon: {
      bucket: S3_APPS_PUBLIC_RESSOURCES,
      fullPath: 'icon.png',
    },
  },
};

export default async (appId, { resources }) => {
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    const platforms = {};
    const returnResources = { platforms };

    if (!app) {
      throw new Error('app_not_found');
    }

    const promises = resources.map(async ({ platform, imageName }) => {
      const specs = objGet(resourcesFormats, [platform, imageName]);
      if (!specs) {
        return;
      }

      const s3Params = {
        Bucket: specs.bucket,
        Key: `${appId}/${specs.fullPath}`,
      };

      // Download
      let objAttrs = null;
      try {
        objAttrs = await s3
          .getObjectAttributes({
            ...s3Params,
            ObjectAttributes: ['ObjectSize'],
          })
          .promise();
      } catch (e) {
        /* Do nothing */
      }

      if (!objAttrs) {
        objSet(platforms, [platform, imageName, 'downloadUrl'], null);
      } else {
        s3Params.Expires = 3600;
        objSet(
          platforms,
          [platform, imageName, 'downloadUrl'],
          s3.getSignedUrl('getObject', s3Params)
        );
      }

      // Upload
      s3Params.Expires = 1200;
      s3Params.ContentType = 'image/png';
      objSet(
        platforms,
        [platform, imageName, 'uploadUrl'],
        s3.getSignedUrl('putObject', s3Params)
      );
    });

    await Promise.all(promises);

    /* Return the document ID and the upload url */
    return returnResources;
  } finally {
    client.close();
  }
};

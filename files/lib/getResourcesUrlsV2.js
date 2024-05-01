/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { formatMessage, intlInit } from '../../libs/intl/intl';
import { sendEmailTemplate } from '../../libs/email/sendEmail';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

const { S3_APPS_RESSOURCES, S3_APPS_PUBLIC_RESSOURCES } = process.env;

const { COLL_APPS } = mongoCollections;

const LANG = 'en';
const MAIL_TO = 'prod@crowdaa.com';

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
    icon: {
      bucket: S3_APPS_RESSOURCES,
      fullPath: 'ios/icon.png',
    },
    splash: {
      bucket: S3_APPS_RESSOURCES,
      fullPath: 'ios/splash.png',
    },
    background: {
      bucket: S3_APPS_RESSOURCES,
      fullPath: 'ios/android/icon-background.png',
    },
    foreground: {
      bucket: S3_APPS_RESSOURCES,
      fullPath: 'ios/android/icon-foreground.png',
    },
  },
  android: {
    icon: {
      bucket: S3_APPS_RESSOURCES,
      fullPath: 'android/icon.png',
    },
    splash: {
      bucket: S3_APPS_RESSOURCES,
      fullPath: 'android/splash.png',
    },
    background: {
      bucket: S3_APPS_RESSOURCES,
      fullPath: 'android/android/icon-background.png',
    },
    foreground: {
      bucket: S3_APPS_RESSOURCES,
      fullPath: 'android/android/icon-foreground.png',
    },
  },
  public: {
    icon: {
      bucket: S3_APPS_PUBLIC_RESSOURCES,
      fullPath: 'icon.png',
    },
  },
};

export const allActions = ['get', 'put'];

export default async (appId, { action, resources }) => {
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    const urls = {};
    const returnResources = { urls, action };

    if (!app) {
      throw new Error('app_not_found');
    }

    const promises = resources.map(async ({ platform, iconName }) => {
      const specs = resourcesFormats[platform][iconName];
      const s3Params = {
        Bucket: specs.bucket,
        Key: `${appId}/${specs.fullPath}`,
      };

      if (action === 'get') {
        let params = null;
        try {
          params = await s3.getObjectAttributes(s3Params).promise();
        } catch (e) {
          /* Do nothing */
        }

        if (!params) {
          objSet(urls, [platform, iconName], null);
        } else {
          s3Params.Expires = 3600;
          objSet(
            urls,
            [platform, iconName],
            s3.getSignedUrl('getObject', s3Params)
          );
        }
      } else if (action === 'put') {
        s3Params.Expires = 1200;
        s3Params.ContentType = 'image/png';
        objSet(
          urls,
          [platform, iconName],
          s3.getSignedUrl('putObject', s3Params)
        );
      }
    });

    await Promise.all(promises);

    if (action === 'put') {
      intlInit(LANG);

      const subject = formatMessage(
        'files:requested_resource_upload_url.title',
        {
          appName: app.name,
          region: process.env.REGION,
          stage: process.env.STAGE,
        }
      );

      const resourcesList = [];
      Object.keys(urls).forEach((type) => {
        Object.keys(urls[type]).forEach((format) => {
          resourcesList.push(`<li>${type} / ${format}</li>`);
        });
      });

      const html = formatMessage('files:requested_resource_upload_url.html', {
        appName: app.name,
        resources: resourcesList.join('\n'),
      });

      await sendEmailTemplate(LANG, 'internal', MAIL_TO, subject, html);
    }

    /* Return the document ID and the upload url */
    return returnResources;
  } finally {
    client.close();
  }
};

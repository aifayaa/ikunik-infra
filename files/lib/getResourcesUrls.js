/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { formatMessage, intlInit } from '../../libs/intl/intl';
import { sendEmailTemplate } from '../../libs/email/sendEmail';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

const { S3_RESOURCES_BUCKET, S3_PUBLIC_RESOURCES_BUCKET } = process.env;

const { COLL_APPS } = mongoCollections;

const LANG = 'en';
const MAIL_TO = 'prod@crowdaa.com';

export const resourceFormatToPath = {
  icon: { path: 'icon.png', basename: 'icon.png' },
  splash: { path: 'splash.png', basename: 'splash.png' },
  background: {
    path: 'android/icon-background.png',
    basename: 'icon-background.png',
  },
  foreground: {
    path: 'android/icon-foreground.png',
    basename: 'icon-foreground.png',
  },
};

export const allActions = ['get', 'put'];
export const allResourceTypes = ['ios', 'android', 'public'];
export const allResourceFormats = Object.keys(resourceFormatToPath);

export default async (
  appId,
  {
    action,
    resourceTypes = allResourceTypes,
    resourceFormats = allResourceFormats,
  }
) => {
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    const urls = {};
    const returnResources = { urls };

    if (!app) {
      throw new Error('app_not_found');
    }
    let iosPackageId = null;
    let androidPackageId = null;
    if (app.builds && app.builds.ios && app.builds.ios.packageId) {
      iosPackageId = app.builds.ios.packageId;
    }
    if (app.builds && app.builds.android && app.builds.android.packageId) {
      androidPackageId = app.builds.android.packageId;
    }

    resourceTypes.forEach((type) => {
      resourceFormats.forEach((format) => {
        const s3Params = {};

        if (type === 'ios' && iosPackageId) {
          s3Params.Bucket = S3_RESOURCES_BUCKET;
          s3Params.Key = `${appId}/${iosPackageId}_ios/${resourceFormatToPath[format].path}`;
        } else if (type === 'android' && androidPackageId) {
          s3Params.Bucket = S3_RESOURCES_BUCKET;
          s3Params.Key = `${appId}/${androidPackageId}_android/${resourceFormatToPath[format].path}`;
        } else if (type === 'public') {
          s3Params.Bucket = S3_PUBLIC_RESOURCES_BUCKET;
          s3Params.Key = `${appId}/${resourceFormatToPath[format].basename}`;
        }

        if (!urls[type]) urls[type] = {};

        if (action === 'put') {
          s3Params.Expires = 1200;
          s3Params.ContentType = 'image/png';
          urls[type][format] = s3.getSignedUrl('putObject', s3Params);
        } else if (action === 'get') {
          s3Params.Expires = 3600;
          urls[type][format] = s3.getSignedUrl('getObject', s3Params);
        }
      });
    });

    returnResources.action = action;

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

      const resources = [];
      Object.keys(urls).forEach((type) => {
        Object.keys(urls[type]).forEach((format) => {
          resources.push(`<li>${type} / ${format}</li>`);
        });
      });

      const html = formatMessage('files:requested_resource_upload_url.html', {
        appName: app.name,
        resources: resources.join('\n'),
      });

      await sendEmailTemplate(LANG, 'internal', MAIL_TO, subject, html);
    }

    /* Return the document ID and the upload url */
    return returnResources;
  } finally {
    client.close();
  }
};

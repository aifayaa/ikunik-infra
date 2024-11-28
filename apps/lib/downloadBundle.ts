/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import MongoClient from '../../libs/mongoClient.js';

import { getApp } from './appsUtils';
import { ExtensionType } from './type';

const { S3_APPS_RESSOURCES } = process.env;

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

export default async (
  appId: string,
  validityDuration: number,
  {
    extension,
  }: {
    extension: ExtensionType;
  }
) => {
  const client = await MongoClient.connect();

  try {
    const app = await getApp(appId);
    const {
      name: appName,
      builds: {
        android: { version: androidBuildVersion },
        ios: { version: iOSBuildVersion },
      },
    } = app;
    // 20241128 : The download fails with « ' » in the name.
    const escapedAppName = appName.replace(/[^a-zA-Z0-9_]+/g, '-');

    let filename = '';
    switch (extension) {
      case 'apk':
        filename = `${escapedAppName}_v${androidBuildVersion}.${extension}`;
        break;
      case 'aab':
        filename = `${escapedAppName}_v${androidBuildVersion}.${extension}`;
        break;
      case 'ipa':
        filename = `${escapedAppName}_v${iOSBuildVersion}.${extension}`;
        break;
    }

    const s3Params = {
      Bucket: S3_APPS_RESSOURCES,
      Key: `${appId}/app.${extension}`,
      Expires: validityDuration,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    };

    const url = s3.getSignedUrl('getObject', s3Params);

    return url;
  } finally {
    client.close();
  }
};

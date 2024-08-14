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
    await getApp(appId);

    const s3Params = {
      Bucket: S3_APPS_RESSOURCES,
      Key: `${appId}/app.${extension}`,
      Expires: validityDuration,
    };
    console.log('s3Params', s3Params);

    const url = s3.getSignedUrl('getObject', s3Params);

    return url;
  } finally {
    client.close();
  }
};

/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import nodePath from 'node:path';
import nodeFs from 'node:fs';
import nodeStream from 'node:stream';
import archiver from 'archiver';
import MongoClient from '../../libs/mongoClient.js';

import { getApp } from './appsUtils';

const { S3_APPS_RESSOURCES } = process.env;

const DESTINATION_SCREENSHOTS_DIR_KEY_PATH = 'screenshots';
const DESTINATION_SCREENSHOTS_ZIP_KEY_PATH = `${DESTINATION_SCREENSHOTS_DIR_KEY_PATH}/screenshots.zip`;
const LOCAL_ZIP_PATH = '/tmp/screenshots.zip';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

export default async (appId: string, validityDuration: number) => {
  const client = await MongoClient.connect();

  try {
    await getApp(appId);

    const screenshotFiles = await s3
      .listObjects({
        Bucket: S3_APPS_RESSOURCES as string,
        Prefix: `${appId}/${DESTINATION_SCREENSHOTS_DIR_KEY_PATH}`,
      })
      .promise();

    if (!screenshotFiles.Contents || screenshotFiles.Contents.length === 0) {
      return null;
    }

    const screenshotFilesInfos = screenshotFiles.Contents.filter(({ Key }) => {
      if (!Key || !Key.match(/\.(jpe?g|png)$/)) {
        return false;
      }
      return true;
    });

    if (screenshotFilesInfos.length === 0) {
      return null;
    }

    await new Promise(
      (resolve: (value?: any) => void, reject: (reason: any) => void) => {
        const archive = archiver('zip', {
          zlib: { level: 9 },
        });
        archive.on('warning', function (err: { code: string }) {
          if (err.code === 'ENOENT') {
            console.warn('File not found:', err);
          } else {
            throw err;
          }
        });

        archive.on('error', (err: Error) => {
          throw err;
        });

        archive.on('end', () => {
          resolve();
        });

        const output = nodeFs.createWriteStream(LOCAL_ZIP_PATH);
        archive.pipe(output);

        screenshotFilesInfos.forEach(({ Key }) => {
          if (!Key) {
            return null;
          }

          const fileName = nodePath.basename(Key);

          const stream = s3
            .getObject({
              Bucket: S3_APPS_RESSOURCES as string,
              Key,
            })
            .createReadStream()
            .on('error', reject);

          archive.append(stream, { name: fileName });
        });

        archive.finalize();
      }
    );

    const input = await nodeFs.promises.readFile(LOCAL_ZIP_PATH);

    await s3
      .putObject({
        Body: input,
        Bucket: S3_APPS_RESSOURCES as string,
        Key: `${appId}/${DESTINATION_SCREENSHOTS_ZIP_KEY_PATH}`,
      })
      .promise();

    const s3Params = {
      Bucket: S3_APPS_RESSOURCES,
      Key: `${appId}/${DESTINATION_SCREENSHOTS_ZIP_KEY_PATH}`,
      Expires: validityDuration,
    };
    console.log('s3Params', s3Params);

    const url = s3.getSignedUrl('getObject', s3Params);

    return url;
  } finally {
    client.close();
  }
};

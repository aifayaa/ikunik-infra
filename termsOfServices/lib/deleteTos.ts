/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_SETUP,
  MISSING_ENVIRONMENT_VARIABLE_CODE,
} from '../../libs/httpResponses/errorCodes';

const { COLL_TOS } = mongoCollections;

const { S3_BUCKET_TOS } = process.env;

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

export default async (appId: string, tosId: string) => {
  const client = await MongoClient.connect();
  try {
    await client.db().collection(COLL_TOS).deleteOne({ _id: tosId, appId });

    const s3Filepath = `${appId}/${tosId}.html`;

    if (!S3_BUCKET_TOS) {
      throw new CrowdaaError(
        ERROR_TYPE_SETUP,
        MISSING_ENVIRONMENT_VARIABLE_CODE,
        `Missing environment variable S3_BUCKET_TOS: ${S3_BUCKET_TOS}`
      );
    }

    await s3
      .deleteObject({
        Bucket: S3_BUCKET_TOS,
        Key: s3Filepath,
      })
      .promise();

    return {
      deletedResources: {
        tosIds: [tosId],
      },
    };
  } finally {
    client.close();
  }
};

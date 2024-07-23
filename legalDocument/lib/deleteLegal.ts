/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { getEnvironmentVariable } from '../../libs/check';
import { computeS3Filepath } from './utils';
import { LegalDocumentType } from './type';

const { COLL_TOS } = mongoCollections;

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

export default async (
  appId: string,
  type: LegalDocumentType,
  legalDocumentId: string
) => {
  const client = await MongoClient.connect();
  try {
    const mongoResponse = await client
      .db()
      .collection(COLL_TOS)
      .deleteOne({ _id: legalDocumentId, appId, type });
    const { deletedCount } = mongoResponse;

    if (!deletedCount) {
      return {
        deletedResources: {
          legalDocumentIds: [],
        },
      };
    }

    const s3Filepath = computeS3Filepath(legalDocumentId, appId, type);
    const S3_BUCKET_TOS = getEnvironmentVariable('S3_BUCKET_TOS');

    await s3
      .deleteObject({
        Bucket: S3_BUCKET_TOS,
        Key: s3Filepath,
      })
      .promise();

    return {
      deletedResources: {
        legalDocumentIds: [legalDocumentId],
      },
    };
  } finally {
    client.close();
  }
};

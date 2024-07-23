/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_TOS } = mongoCollections;

const { S3_BUCKET_TOS } = process.env;

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

export default async (appId, tosId) => {
  const client = await MongoClient.connect();
  try {
    const { ok } = await client
      .db()
      .collection(COLL_TOS)
      .deleteOne({ _id: tosId, appId });

    const s3Filepath = `${appId}/${tosId}.html`;

    await s3
      .deleteObject({
        Bucket: S3_BUCKET_TOS,
        Key: s3Filepath,
      })
      .promise();

    return ok;
  } finally {
    client.close();
  }
};

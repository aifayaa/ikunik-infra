/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_TOS } = mongoCollections;

const { S3_BUCKET_TOS } = process.env;

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

export default async (
  appId,
  title,
  html,
  { userId, type, outdated, required, url }
) => {
  const client = await MongoClient.connect();
  try {
    const newTos = {
      _id: ObjectID().toString(),
      appId,
      createdAt: new Date(),
      createdBy: userId,
      html,
      outdated,
      required,
      title,
      type,
      url,
    };

    const mongoResponse = await client
      .db()
      .collection(COLL_TOS)
      .insertOne(newTos);

    console.log('newTosInDB:', mongoResponse);
    const document = mongoResponse.ops[0];
    console.log('document:', document);

    const { _id: tosId } = document;

    const s3Key = `${tosId}.html`;
    console.log('s3Key', s3Key);

    const s3Response = await s3
      .putObject({
        Bucket: S3_BUCKET_TOS,
        // Bucket: oBucket,
        ACL: 'public-read',
        Body: html,
        ContentType: 'text/html',
        Key: s3Key,
        // Metadata: picture.Metadata,
      })
      .promise();

    // Generated URL
    // https://crowdaa-tos.s3.amazonaws.com/669917e8d5ad258ff1c0de7a.html

    console.log('s3Response', s3Response);

    return newTos;
  } finally {
    client.close();
  }
};

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
  { userId, type, outdated, required }
) => {
  const client = await MongoClient.connect();
  try {
    const documentId = ObjectID().toString();
    const s3Filepath = `${appId}/${documentId}.html`;

    const htmlWrapperHead =
      '<!doctype html>' +
      '<html>' +
      '<head>' +
      '<meta charset="utf-8" />' +
      '<meta name="viewport" content="width=device-width" />' +
      '<title>Terms of Services</title>' +
      '</head>' +
      '<body>';

    const htmlWrapperTail = '</body></html>';

    const documentContent = `${htmlWrapperHead}<h1>${title}</h1>${html}${htmlWrapperTail}`;

    await s3
      .putObject({
        Bucket: S3_BUCKET_TOS,
        ACL: 'public-read',
        Body: documentContent,
        ContentType: 'text/html',
        Key: s3Filepath,
      })
      .promise();

    const s3GeneratedUrl = `https://${S3_BUCKET_TOS}.s3.amazonaws.com/${s3Filepath}`;
    // console.log('s3Response', s3Response);

    const newTos = {
      _id: documentId,
      createdAt: new Date(),
      createdBy: userId,
      url: s3GeneratedUrl,
      appId,
      title,
      html,
      type,
      outdated,
      required,
    };

    await client.db().collection(COLL_TOS).insertOne(newTos);

    // console.log('newTosInDB:', mongoResponse);
    // const document = mongoResponse.ops[0];
    // console.log('document:', document);

    // const { _id: tosId } = document;

    return newTos;
  } finally {
    client.close();
  }
};

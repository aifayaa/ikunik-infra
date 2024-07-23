/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { DocumentType } from './type';
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

export default async (
  appId: string,
  title: string,
  html: string,
  {
    userId,
    type,
    outdated,
    required,
  }: {
    userId: string;
    type: DocumentType;
    outdated: boolean;
    required: boolean;
  }
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

    if (!S3_BUCKET_TOS) {
      throw new CrowdaaError(
        ERROR_TYPE_SETUP,
        MISSING_ENVIRONMENT_VARIABLE_CODE,
        `Missing environment variable S3_BUCKET_TOS: ${S3_BUCKET_TOS}`
      );
    }

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

    return newTos;
  } finally {
    client.close();
  }
};

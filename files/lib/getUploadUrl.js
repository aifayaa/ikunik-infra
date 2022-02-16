import path from 'path';
import AWS from 'aws-sdk';
import uuidv4 from 'uuid/v4';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import uploadStatus from '../uploadStatus.json';
import getCollectionFromContentType from './getCollectionFromContentType';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

const {
  S3_UPLOAD_BUCKET,
} = process.env;

const {
  COLL_VIDEOS,
} = mongoCollections;

export default async (userId, appId, files, metadata) => {
  const insertions = {};
  const returns = [];
  const client = await MongoClient.connect();

  files.forEach((file) => {
    const {
      name,
      type,
      // size, // unused yet
    } = file;
    const collection = getCollectionFromContentType(type);

    /* Preparing s3 parameters to get an upload link */
    const fileExtension = path.extname(name);
    const dirPrefix = collection === COLL_VIDEOS ? 'VideoStorage/' : '';
    const key = `${dirPrefix}${uuidv4()}${fileExtension}`;
    const id = uuidv4();
    const s3Params = {
      Bucket: S3_UPLOAD_BUCKET,
      Key: key,
      ContentType: type,
      ACL: 'public-read',
      Metadata: {
        ...metadata,
        id,
        type,
      },
      /* URL will expire in 6 hours. Required for big videos (or files in general)
       * since the timeout silently discard the upload if it's still running */
      Expires: 21600,
    };

    /* Inserting a document in the database already with status UPLOADING */
    const fileDoc = {
      _id: id,
      createdAt: new Date(),
      fromUserId: userId,
      appId,
      isPublished: false,
      status: uploadStatus.UPLOADING,
    };

    if (collection === COLL_VIDEOS) {
      fileDoc.distribution = 'freeStream';
    }

    if (typeof insertions[collection] === 'undefined') {
      insertions[collection] = [];
    }
    insertions[collection].push(fileDoc);
    returns.push({
      id,
      name,
      // @TODO: use createPresignedPost instead of getSignedUrl
      //  -> so we can use Content-Length header
      url: s3.getSignedUrl('putObject', s3Params),
    });
  });

  try {
    /* eslint-disable */
    for(const collection in insertions) {
      await client.db().collection(collection).insertMany(insertions[collection]);
    }
    /* eslint-enable */
  } finally {
    client.close();
  }

  /* Return the document ID and the upload url */
  return returns;
};

import AWS from 'aws-sdk';
import MongoClient from '../../libs/mongoClient';
import getCollectionFromContentType from './getCollectionFromContentType';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

const { DB_NAME, S3_UPLOAD_BUCKET } = process.env;

export default async (files) => {
  const deletions = {};
  const client = await MongoClient.connect();
  const s3ObjectsToDelete = [];

  files.forEach((file) => {
    const { type, id, url } = file;
    const collection = getCollectionFromContentType(type);

    /* Preparing s3 parameters to delete objects */
    const urlNoQueryString = url.split('?')[0];
    // example value : 'https://slsupload-dev.s3.amazonaws.com/85db9c75-0860-4014-b02d-b6acd2a9a247.jpg';
    const key = urlNoQueryString.slice(urlNoQueryString.lastIndexOf('/') + 1);
    s3ObjectsToDelete.push({ Key: key });

    if (typeof deletions[collection] === 'undefined') {
      deletions[collection] = [];
    }
    deletions[collection].push(id);
  });

  const s3Params = {
    Bucket: S3_UPLOAD_BUCKET,
    Delete: {
      Objects: s3ObjectsToDelete,
    },
  };

  try {
    /* eslint-disable */
    for (const collection in deletions) {
      await client
      .db(DB_NAME)
        .collection(collection)
        .deleteMany({ _id: { $in: deletions[collection] } });
    }
    /* eslint-enable */
    await s3.deleteObjects(s3Params).promise();
    return 'ok';
  } finally {
    client.close();
  }
};

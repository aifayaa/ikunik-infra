import AWS from 'aws-sdk';
import MongoClient from '../../libs/mongoClient';
import getCollectionFromContentType from './getCollectionFromContentType';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

const { DB_NAME, S3_UPLOAD_BUCKET } = process.env;

export default async (file) => {
  const client = await MongoClient.connect();

  const { type, id, url } = file;
  const collection = getCollectionFromContentType(type);

  /* Preparing s3 parameters to delete objects */
  const urlNoQueryString = url.split('?')[0];
  // example value : 'https://slsupload-dev.s3.amazonaws.com/85db9c75-0860-4014-b02d-b6acd2a9a247.jpg';
  const key = urlNoQueryString.slice(urlNoQueryString.lastIndexOf('/') + 1);
  const s3Params = {
    Bucket: S3_UPLOAD_BUCKET,
    Key: key,
  };

  try {
    /* eslint-disable */
    await client.db(DB_NAME).collection(collection).deleteOne({ _id: id });
    /* eslint-enable */
    await s3.deleteObject(s3Params).promise();
    return 'ok';
  } finally {
    client.close();
  }
};

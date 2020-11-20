import AWS from 'aws-sdk';
import MongoClient from '../../libs/mongoClient';
import getCollectionFromContentType from './getCollectionFromContentType';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

const {
  DB_NAME,
  S3_UPLOAD_BUCKET,
  S3_PICTURES_BUCKET,
  S3_VIDEOS_BUCKET,
  COLL_PICTURES,
  COLL_VIDEOS,
} = process.env;

export default async (userId, appId, file) => {
  const client = await MongoClient.connect();

  const { type, id, url } = file;
  const collection = getCollectionFromContentType(type);

  /* Preparing s3 parameters to delete objects */
  const urlNoQueryString = url.split('?')[0]; // example value : 'https://slsupload-dev.s3.amazonaws.com/85db9c75-0860-4014-b02d-b6acd2a9a247.jpg';
  const key = urlNoQueryString.slice(urlNoQueryString.lastIndexOf('/') + 1);
  const uploadS3Params = {
    Bucket: S3_UPLOAD_BUCKET,
    Key: key,
  };

  try {
    await client.db(DB_NAME).collection(collection).deleteOne({ _id: id });

    if (collection === COLL_PICTURES) {
      const prefixes = ['thumb', 'medium', 'large', 'original'];
      const keys = prefixes.map((prefix) => ({
        Key: `${prefix}-${key.split('.')[0]}.jpeg`, // only .jpeg supported in managePicture.js
      }));
      const picturesS3Params = {
        Bucket: S3_PICTURES_BUCKET,
        Delete: {
          Objects: keys,
        },
      };
      await s3.deleteObjects(picturesS3Params).promise();
    } else {
      // const videosS3Params = {
      //   Bucket: S3_VIDEOS_BUCKET,
      //   Delete: key,
      // };
      // await s3.deleteObjects(videosS3Params).promise();
    }

    await s3.deleteObject(uploadS3Params).promise();
    return 'ok';
  } finally {
    client.close();
  }
};

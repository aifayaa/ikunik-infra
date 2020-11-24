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
} = process.env;

export default async (userId, appId, file) => {
  const client = await MongoClient.connect();

  const { type, id, url } = file;
  const collection = getCollectionFromContentType(type);

  /* Preparing s3 parameters to delete objects */
  const urlNoQueryString = url.split('?')[0];
  /**
   * Example urlNoQueryString values
   * "https://slsupload-dev.s3.amazonaws.com/85db9c75-0860-4014-b02d-b6acd2a9a247.jpg"
   * "https://slsupload-dev.s3.amazonaws.com/VideoStorage/bb72193f-7589-4883-bf18-e2566762915c.mp4"
   */
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
      const videoId = key.split('.')[0];
      const prefix = `videos/${videoId}`;
      const videosObjects = await s3.listObjectsV2({
        Bucket: S3_VIDEOS_BUCKET,
        Prefix: prefix,
      }).promise();

      if (videosObjects.Contents) {
        // All encoded videos
        const keys = videosObjects.Contents.map((videoObject) => ({
          Key: `${videoObject.Key}`,
        }));
        // Root directory
        keys.push({
          Key: prefix,
        });
        const videosS3Params = {
          Bucket: S3_VIDEOS_BUCKET,
          Delete: {
            Objects: keys,
          },
        };
        await s3.deleteObjects(videosS3Params).promise();
      }
    }

    await s3.deleteObject(uploadS3Params).promise();
    return 'ok';
  } finally {
    client.close();
  }
};

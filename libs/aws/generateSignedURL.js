/* eslint-disable import/no-relative-packages */
import { S3 } from 'aws-sdk';

export default (Key, endpoint) => {
  const s3 = new S3({
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    endpoint,
    s3BucketEndpoint: !!endpoint,
  });
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.S3_BUCKET,
    Key,
  });
};

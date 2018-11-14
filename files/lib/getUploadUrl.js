import AWS from 'aws-sdk/';

const s3 = new AWS.S3();

export default (userId, key, type, length) => {
  const s3Params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: type,
    ACL: 'public-read',
    ContentLength: length,
    Expires: 900, // URL will expire in 15 minutes
  };
  return s3.getSignedUrl('putObject', s3Params);
};

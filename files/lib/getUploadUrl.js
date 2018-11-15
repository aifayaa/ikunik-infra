import AWS from 'aws-sdk/';
import uuidv4 from 'uuid/v4';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

export default (userId, filename, type, length) => {
  const key = `${uuidv4()}-${filename}`;
  const id = uuidv4();
  const s3Params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: type,
    ACL: 'public-read',
    ContentLength: length,
    Metadata: {
      userId,
      id,
    },
    Expires: 900, // URL will expire in 15 minutes
  };
  return {
    id,
    url: s3.getSignedUrl('putObject', s3Params),
  };
};

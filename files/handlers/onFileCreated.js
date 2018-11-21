import AWS from 'aws-sdk/';
import managePicture from '../lib/managePicture';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

export default async (event, context, callback) => {
  const {
    bucket,
    object,
  } = event.Records[0].s3;
  const response = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
  try {
    const params = {
      Bucket: bucket.name,
      Key: decodeURI(object.key).replace(/\+/gi, ' '),
    };
    const file = await s3.getObject(params).promise();
    const {
      ContentType,
    } = file;

    switch (ContentType) {
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
        await managePicture(bucket, object, file);
        break;
      default:
        throw new Error(`${ContentType} not handled`);
    }

    response.statusCode = 200;
    response.body = 'ok';
  } catch (e) {
    response.statusCode = 500;
    response.body = JSON.stringify({
      message: e.message,
    });
  } finally {
    callback(null, response);
  }
};

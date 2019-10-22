import AWS from 'aws-sdk/';
import managePicture from '../lib/managePicture';
import manageVideo from '../lib/manageVideo';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

export default async (event, _context, callback) => {
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
      case 'image/gif':
      case 'image/jpeg':
      case 'image/png':
        await managePicture(bucket, object, file);
        break;
      case 'video/avi':
      case 'video/mkv':
      case 'video/mp4':
      case 'video/webm':
        await manageVideo(bucket, object, file);
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

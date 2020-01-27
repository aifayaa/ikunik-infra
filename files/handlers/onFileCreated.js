import AWS from 'aws-sdk/';
import managePicture from '../lib/managePicture';
import manageVideo from '../lib/manageVideo';
import response from '../../libs/httpResponses/response';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

export default async (event) => {
  const {
    bucket,
    object,
  } = event.Records[0].s3;

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

    return response({ code: 200, body: 'ok' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

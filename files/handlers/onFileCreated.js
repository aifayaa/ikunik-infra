import AWS from 'aws-sdk/';
import managePicture from '../lib/managePicture';
import manageVideo from '../lib/manageVideo';
import response from '../../libs/httpResponses/response';
import getCollectionFromContentType from '../lib/getCollectionFromContentType';

const {
  COLL_PICTURES,
  COLL_VIDEOS,
} = process.env;

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

    const collection = getCollectionFromContentType(ContentType);
    if (collection === COLL_PICTURES) {
      await managePicture(bucket, object, file);
    } else if (collection === COLL_VIDEOS) {
      await manageVideo(bucket, object, file);
    }

    return response({ code: 200, body: 'ok' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

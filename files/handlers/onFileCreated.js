import AWS from 'aws-sdk/';
import managePicture from '../lib/managePicture';
import manageVideo from '../lib/manageVideo';
import manageDocument from '../lib/manageDocument';
import response from '../../libs/httpResponses/response';
import getCollectionFromContentType from '../lib/getCollectionFromContentType';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_DOCUMENTS,
  COLL_PICTURES,
  COLL_VIDEOS,
} = mongoCollections;

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

    const fileHead = await s3.headObject(params).promise();

    const {
      ContentType,
    } = fileHead;

    const collection = getCollectionFromContentType(ContentType);
    if (collection === COLL_PICTURES) {
      const file = await s3.getObject(params).promise();
      await managePicture(bucket, object, file);
    } else if (collection === COLL_VIDEOS) {
      await manageVideo(bucket, object, fileHead);
    } else if (collection === COLL_DOCUMENTS) {
      await manageDocument(bucket, object, fileHead);
    }

    return response({ code: 200, body: 'ok' });
  } catch (e) {
    console.log('Error', e);
    return response({ code: 500, message: e.message });
  }
};

/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk/';
import managePicture from '../lib/managePicture';
import manageVideo from '../lib/manageVideo';
import manageDocument from '../lib/manageDocument';
import response from '../../libs/httpResponses/response.ts';
import getCollectionFromContentType from '../lib/getCollectionFromContentType';
import mongoCollections from '../../libs/mongoCollections.json';
import MongoClient from '../../libs/mongoClient';

const { COLL_DOCUMENTS, COLL_PICTURES, COLL_VIDEOS } = mongoCollections;

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

export default async (event) => {
  const { bucket, object } = event.Records[0].s3;

  try {
    const params = {
      Bucket: bucket.name,
      Key: decodeURI(object.key).replace(/\+/gi, ' '),
    };

    const fileHead = await s3.headObject(params).promise();

    const { ContentType } = fileHead;
    const collection = getCollectionFromContentType(ContentType);
    const sourceKey = params.Key;
    const client = await MongoClient.connect();

    let document;
    try {
      document = await client.db().collection(collection).findOne({
        sourceKey,
      });
    } finally {
      client.close();
    }

    if (!document) {
      throw new Error('document_not_found');
    }

    if (collection === COLL_PICTURES) {
      const file = await s3.getObject(params).promise();
      await managePicture(bucket, object, file, document);
    } else if (collection === COLL_VIDEOS) {
      await manageVideo(bucket, object, fileHead, document);
    } else if (collection === COLL_DOCUMENTS) {
      await manageDocument(bucket, object, fileHead, document);
    }

    return response({ code: 200, body: 'ok' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

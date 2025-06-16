/* eslint-disable import/no-relative-packages */
import path from 'path';
import S3 from 'aws-sdk/clients/s3';

import getCollectionFromContentType from './getCollectionFromContentType';
import uploadStatus from '../uploadStatus.json';

import MongoClient from '../../libs/mongoClient';

const { S3_PICTURES_BUCKET, CDN_DOMAIN_NAME } = process.env;

const s3 = new S3({
  signatureVersion: 'v4',
});

export default async (bucket, object, fileHead) => {
  const client = await MongoClient.connect();

  /* all key names are lowercaser in metadata */
  const { id, title, type } = fileHead.Metadata;

  try {
    /* Get existing document and check it exists */
    const collection = getCollectionFromContentType(type);
    const document = await client.db().collection(collection).findOne({
      _id: id,
    });

    if (!document) {
      throw new Error('document_not_found');
    }

    /* Check content type match */
    if (type !== fileHead.ContentType) {
      await client
        .db()
        .collection(collection)
        .updateOne(
          { _id: document._id },
          { $set: { status: uploadStatus.UPLOAD_ERROR } }
        );
      throw new Error('content_type_mismatch');
    }

    const finalDocument = Object.assign(document, {
      status: uploadStatus.ENCODING,
      title,
      type,
    });

    await client
      .db()
      .collection(collection)
      .updateOne({ _id: document._id }, { $set: finalDocument });

    const params = {
      Bucket: bucket.name,
      Key: decodeURI(object.key).replace(/\+/gi, ' '),
    };
    const file = await s3.getObject(params).promise();

    const documentName = `${decodeURI(object.key).replace(/\+/gi, ' ')}`;
    const { base: decodedName } = path.parse(documentName);
    const destKey = `documents/${decodedName}`;
    await s3
      .putObject({
        ACL: 'public-read',
        Body: file.Body,
        Bucket: S3_PICTURES_BUCKET,
        ContentType: type,
        Key: destKey,
        Metadata: document.Metadata,
      })
      .promise();

    finalDocument.filename = destKey;
    finalDocument.url = `https://${CDN_DOMAIN_NAME}/${destKey}`;
    finalDocument.status = uploadStatus.READY;
    finalDocument.size = file.ContentLength;

    await client
      .db()
      .collection(collection)
      .updateOne({ _id: document._id }, { $set: finalDocument });
  } finally {
    client.close();
  }
};

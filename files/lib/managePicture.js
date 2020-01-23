/* eslint-disable no-await-in-loop */
import AWS from 'aws-sdk';
import Sharp from 'sharp';
import MongoClient from '../../libs/mongoClient';
import getCollectionFromContentType from './getCollectionFromContentType';
import uploadStatus from '../uploadStatus.json';

const S3 = new AWS.S3({
  signatureVersion: 'v4',
});

const {
  DB_NAME,
  S3_PICTURES_BUCKET,
  CDN_DOMAIN_NAME,
} = process.env;

const outBucket = S3_PICTURES_BUCKET;

const resizeParams = ({ keepRatio = false }) => [{
  resize: {
    width: keepRatio ? null : 150,
    height: 150,
    fit: keepRatio ? 'inside' : 'contain',
  },
  prefix: 'thumb',
  docField: 'thumb',
}, {
  resize: {
    width: keepRatio ? null : 500,
    height: 500,
    fit: keepRatio ? 'inside' : 'contain',
  },
  prefix: 'medium',
  docField: 'medium',
}, {
  resize: {
    width: keepRatio ? null : 1024,
    height: 1024,
    fit: keepRatio ? 'inside' : 'contain',
  },
  prefix: 'large',
  docField: 'large',
}, {
  resize: {
    width: null,
    height: null,
  },
  prefix: 'original',
  docField: 'picture',
}];

const resizeAndUpload = async (picture, oBucket, oKey, resizeOpts) => {
  const { data: resizeBuffer, info } = await Sharp(picture.Body)
    .resize(resizeOpts)
    .toFormat('png')
    .toBuffer({ resolveWithObject: true });

  await S3.putObject({
    ACL: 'public-read',
    Body: resizeBuffer,
    Bucket: oBucket,
    ContentType: 'image/png',
    Key: oKey,
    Metadata: picture.Metadata,
  }).promise();

  return {
    key: oKey,
    url: `https://${CDN_DOMAIN_NAME}/${oKey}`,
    info,
  };
};

export default async (bucket, object, file) => {
  const client = await MongoClient.connect();

  /* all key names are lowercaser in metadata */
  const {
    id,
    title,
    type,
    opts = '{}',
  } = file.Metadata;

  if (!id) {
    throw new Error('missing_id');
  }

  try {
    const collection = getCollectionFromContentType(type);
    const document = await client.db(DB_NAME)
      .collection(collection)
      .findOne({
        _id: id,
      });

    if (!document) {
      throw new Error('document_not_found');
    }

    if (type !== file.ContentType) {
      await client.db(DB_NAME)
        .collection(collection)
        .updateOne(
          { _id: document._id },
          { $set: { status: uploadStatus.UPLOAD_ERROR } },
        );
      throw new Error('content_type_mismatch');
    }

    const pictureDoc = Object.assign(document, {
      description: '',
      height: 0,
      isPublished: true,
      largeFileObj_ID: null,
      largeFilename: null,
      largeUrl: null,
      likes: 0,
      mediumFileObj_ID: null,
      mediumFilename: null,
      mediumUrl: null,
      pictureFileObj_ID: null,
      pictureFilename: object.key,
      pictureUrl: null,
      profil_ID: null,
      project_ID: null,
      selectedGenres: [],
      status: uploadStatus.ENCODING,
      thumbFileObj_ID: null,
      thumbFilename: null,
      thumbUrl: null,
      title: title || '',
      views: 0,
      width: 0,
    });

    await client.db(DB_NAME)
      .collection(collection)
      .updateOne(
        { _id: document._id },
        { $set: pictureDoc },
      );

    const resParams = resizeParams(JSON.parse(opts));
    for (let i = 0; i < resParams.length; i += 1) {
      const params = resParams[i];
      const results = await resizeAndUpload(
        file,
        outBucket,
        `${params.prefix}-${decodeURI(object.key).replace(/\+/gi, ' ')}`,
        params.resize,
      );
      const {
        key,
        info,
        url,
      } = results;
      pictureDoc[`${params.docField}Filename`] = key;
      pictureDoc[`${params.docField}Url`] = url;
      pictureDoc.height = info.height;
      pictureDoc.width = info.width;
    }

    pictureDoc.status = uploadStatus.READY;

    await client.db(DB_NAME)
      .collection(collection)
      .updateOne(
        { _id: document._id },
        { $set: pictureDoc },
      );
  } finally {
    client.close();
  }
  return null;
};

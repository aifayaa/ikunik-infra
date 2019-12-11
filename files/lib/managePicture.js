/* eslint-disable no-await-in-loop */
import AWS from 'aws-sdk';
import Sharp from 'sharp';
import { MongoClient } from 'mongodb';
import getCollectionFromContentType from '../lib/getCollectionFromContentType';
import uploadStatus from '../uploadStatus.json';

const S3 = new AWS.S3({
  signatureVersion: 'v4',
});

const {
  DB_NAME,
  MONGO_URL,
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
  const resizeBuffer = await Sharp(picture.Body)
    .resize(resizeOpts)
    .toFormat('png')
    .toBuffer();
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
  };
};

export default async (bucket, object, file) => {
  const client = await MongoClient.connect(MONGO_URL, {
    useNewUrlParser: true,
  });

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
      likes: 0,
      largeFilename: null,
      largeFileObj_ID: null,
      largeUrl: null,
      mediumFilename: null,
      mediumFileObj_ID: null,
      mediumUrl: null,
      pictureFilename: object.key,
      pictureFileObj_ID: null,
      pictureUrl: null,
      profil_ID: null,
      project_ID: null,
      thumbFilename: null,
      thumbFileObj_ID: null,
      thumbUrl: null,
      title: title || '',
      views: 0,
      selectedGenres: [],
      isPublished: true,
      status: uploadStatus.ENCODING,
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
      const { key, url } = results;
      pictureDoc[`${params.docField}Filename`] = key;
      pictureDoc[`${params.docField}Url`] = url;
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

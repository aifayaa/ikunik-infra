/* eslint-disable no-await-in-loop */
import AWS from 'aws-sdk';
import uuidv4 from 'uuid/v4';
import Sharp from 'sharp';
import {
  MongoClient,
} from 'mongodb';

const S3 = new AWS.S3({
  signatureVersion: 'v4',
});
const outBucket = process.env.S3_PICTURES_BUCKET;

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
    url: `https://s3.amazonaws.com/${oBucket}/${oKey}`,
  };
};

export default async (bucket, object, file) => {
  const {
    Metadata,
  } = file;
  const {
    userid,
    id = uuidv4(),
    title,
    opts = '{}',
  } = Metadata;

  if (!userid) throw new Error('missing_user_id');
  if (!id) throw new Error('missing_user_id');

  const pictureDoc = {
    _id: id,
    createdAt: new Date(),
    description: '',
    fromUserId: userid,
    likes: 0,
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
  };
  const client = await MongoClient.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
  });
  try {
    const resParams = resizeParams(JSON.parse(opts));
    for (let i = 0; i < resParams.length; i += 1) {
      const params = resParams[i];
      const {
        key,
        url,
      } = await resizeAndUpload(file, outBucket, `${params.prefix}-${decodeURI(object.key).replace(/\+/gi, ' ')}`, params.resize);
      pictureDoc[`${params.docField}Filename`] = key;
      pictureDoc[`${params.docField}Url`] = url;
    }
    await client.db(process.env.DB_NAME).collection(process.env.PICTURES_COLL)
      .insertOne(pictureDoc);
  } catch (e) {
    throw e;
  } finally {
    client.close();
  }
  return null;
};

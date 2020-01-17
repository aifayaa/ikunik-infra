import AWS from 'aws-sdk';
import uuidv4 from 'uuid/v4';
import MongoClient from '../../libs/mongoClient'
import uploadStatus from '../uploadStatus.json';
import getCollectionFromContentType from '../lib/getCollectionFromContentType';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

const {
  COLL_VIDEOS,
  DB_NAME,
  MONGO_URL,
  S3_UPLOAD_BUCKET,
} = process.env;

export default async (userId, appId, files, metadata) => {
  const insertions = {};
  const returns = [];
  const client = MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });

  files.forEach((file) => {
    const {
      name,
      type,
      // size, // unused yet
    } = file;
    const collection = getCollectionFromContentType(type);

    /* Preparing s3 parameters to get an upload link */
    const dirPrefix = collection === COLL_VIDEOS ? 'VideoStorage/' : '';
    const key = `${dirPrefix}${uuidv4()}-${name}`;
    const id = uuidv4();
    const s3Params = {
      Bucket: S3_UPLOAD_BUCKET,
      Key: key,
      ContentType: type,
      ACL: 'public-read',
      Metadata: {
        ...metadata,
        id,
        type,
      },
      /* URL will expire in 15 minutes */
      Expires: 900,
    };

    /* Inserting a document in the database already with status UPLOADING */
    const fileDoc = {
      _id: id,
      createdAt: new Date(),
      fromUserId: userId,
      appIds: [appId],
      isPublished: false,
      status: uploadStatus.UPLOADING,
    };

    if (collection === COLL_VIDEOS) {
      fileDoc.distribution = 'freeStream';
    }

    if (typeof insertions[collection] === 'undefined') {
      insertions[collection] = [];
    }
    insertions[collection].push(fileDoc);
    returns.push({
      id,
      name,
      // @TODO: use createPresignedPost instead of getSignedUrl
      //  -> so we can use Content-Length header
      url: s3.getSignedUrl('putObject', s3Params),
    });
  });

  try {
    /* eslint-disable */
    for(const collection in insertions) {
      await client.db(DB_NAME).collection(collection).insertMany(insertions[collection]);
    }
    /* eslint-enable */
  } finally {
    client.close();
  }

  /* Return the document ID and the upload url */
  return returns;
};

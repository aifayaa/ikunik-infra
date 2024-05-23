/* eslint-disable import/no-relative-packages */
import S3 from 'aws-sdk/clients/s3';
import MongoClient from '../../../libs/mongoClient.ts';
import mongoCollections from '../../../libs/mongoCollections.json';

const {
  LEQUOTIDIEN_AWS_KEY,
  LEQUOTIDIEN_AWS_REGION,
  LEQUOTIDIEN_AWS_SECRET,
  LEQUOTIDIEN_BUCKET_PDF,
} = process.env;

const { COLL_USERS } = mongoCollections;

const s3 = new S3({
  region: LEQUOTIDIEN_AWS_REGION,
  credentials: {
    accessKeyId: LEQUOTIDIEN_AWS_KEY,
    secretAccessKey: LEQUOTIDIEN_AWS_SECRET,
  },
});

// TODO: add a check to user permission to access videos not published
export default async (pdfId, { appId, userId, loginToken }) => {
  const client = await MongoClient.connect();
  try {
    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne(
        {
          _id: userId,
          appId,
          'services.resume.loginTokens.hashedToken': loginToken.hashedToken,
        },
        {
          projection: {
            'services.resume.loginTokens.$': 1,
          },
        }
      );

    if (loginToken.backend !== 'wordpress') {
      throw new Error('forbidden');
    }
    if (!user) {
      throw new Error('user_not_found');
    }

    // @TODO CHECK USER PERMS WITH API

    try {
      await s3
        .headObject({
          Bucket: LEQUOTIDIEN_BUCKET_PDF,
          Key: `${pdfId}.pdf`,
        })
        .promise();
    } catch (e) {
      throw new Error('content_not_found');
    }

    const s3Params = {
      Bucket: LEQUOTIDIEN_BUCKET_PDF,
      Key: `${pdfId}.pdf`,
      ResponseContentType: 'application/pdf',
      Expires: 600,
    };

    return s3.getSignedUrl('getObject', s3Params);
  } finally {
    client.close();
  }
};

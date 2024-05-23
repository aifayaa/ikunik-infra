/* eslint-disable import/no-relative-packages */
import get from 'lodash/get';
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET } = process.env;

const { COLL_APPS } = mongoCollections;

export const getFacebookSettings = async (appId) => {
  const client = await MongoClient.connect();
  try {
    const db = await client.db();
    const {
      appId: facebookAppId = FACEBOOK_CLIENT_ID,
      appSecret = FACEBOOK_CLIENT_SECRET,
    } = get(
      await db
        .collection(COLL_APPS)
        .findOne(
          { _id: appId },
          { projection: { 'credentials.facebook': true } }
        ),
      'credentials.facebook',
      {
        appId: FACEBOOK_CLIENT_ID,
        appSecret: FACEBOOK_CLIENT_SECRET,
      }
    );
    return {
      appId: facebookAppId,
      appSecret,
    };
  } finally {
    client.close();
  }
};

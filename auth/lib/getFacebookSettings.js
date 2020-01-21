import get from 'lodash/get';
import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_APPS,
  FACEBOOK_CLIENT_ID,
  FACEBOOK_CLIENT_SECRET,
} = process.env;

export const getFacebookSettings = async (appId) => {
  const client = await MongoClient.connect();
  try {
    const db = await client.db(DB_NAME);
    const {
      appId: facebookAppId = FACEBOOK_CLIENT_ID,
      appSecret = FACEBOOK_CLIENT_SECRET,
    } = get(
      await db
        .collection(COLL_APPS)
        .findOne({ _id: appId }, { projection: { 'credentials.facebook': true } }),
      'credentials.facebook',
      {
        appId: FACEBOOK_CLIENT_ID,
        appSecret: FACEBOOK_CLIENT_SECRET,
      },
    );
    return {
      appId: facebookAppId,
      appSecret,
    };
  } finally {
    client.close();
  }
};

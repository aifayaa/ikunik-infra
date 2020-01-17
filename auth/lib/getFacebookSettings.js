import MongoClient from '../../libs/mongoClient'
import get from 'lodash/get';

const {
  DB_NAME,
  COLL_APPS,
  MONGO_URL,
  FACEBOOK_CLIENT_ID,
  FACEBOOK_CLIENT_SECRET,
} = process.env;

export const getFacebookSettings = async (appId) => {
  const client = MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });
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

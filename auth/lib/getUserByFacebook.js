import MongoClient from '../../libs/mongoClient'
import uuidv4 from 'uuid/v4';
import { getFacebookAppToken } from '../lib/getFacebookAppToken';
import { getFacebookLongLiveToken } from './getFacebookLongLiveToken';
import { getFacebookUserProfile } from '../lib/getFacebookUserProfile';
import { getFacebookSettings } from '../lib/getFacebookSettings';
import generateToken from '../../libs/tokens/generateToken';
import hashToken from '../../libs/tokens/hashToken';

const { DB_NAME, COLL_USERS } = process.env;

/* create/get user from facebook accessToken */
export const getUserByFacebook = async (userToken, appId) => {
  // get facebook app settings
  const settings = await getFacebookSettings(appId);
  const appToken = await getFacebookAppToken(settings);
  const {
    accessToken,
    expiresAt,
    fbUserId,
  } = await getFacebookLongLiveToken(userToken, appToken, settings);
  const client = await MongoClient.connect();
  let userId; // will be retrieved from db or set on user created
  try {
    const collection = await client.db(DB_NAME).collection(COLL_USERS);
    const user = await collection.findOne({
      'services.facebook.id': fbUserId,
    });
    const token = generateToken();
    const hash = hashToken(token);
    const date = new Date();
    if (user) {
      userId = user._id;
      /* update accessToken and generate loginToken */
      const patch = {
        $set: {
          'services.facebook.accessToken': accessToken,
          'services.facebook.expiresAt': expiresAt,
        },
        $addToSet: {
          'services.resume.loginTokens': {
            hashedToken: hash,
            when: date.toISOString(),
          },
          appIds: appId,
        },
      };
      await collection.updateOne({ _id: userId }, patch);
    } else {
      /* create new user */
      let profile = await getFacebookUserProfile(fbUserId, accessToken);
      profile = {
        ...profile,
        username: profile.name,
        avatar: `https://graph.facebook.com/${fbUserId}/picture`,
      };
      delete profile.name;

      userId = uuidv4();
      const userDoc = {
        _id: userId,
        createdAt: date,
        profile,
        appIds: [appId],
        services: {
          facebook: {
            accessToken,
            expiresAt,
            id: fbUserId,
            name: profile.username,
          },
          resume: {
            loginTokens: [{
              hashedToken: hash,
              when: date.toISOString(),
            }],
          },
        },
      };
      await collection.insertOne(userDoc);
    }
    return {
      userId,
      authToken: token,
    };
  } finally {
    client.close();
  }
};

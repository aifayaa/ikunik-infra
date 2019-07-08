import { MongoClient } from 'mongodb';
import uuidv4 from 'uuid/v4';
import getFbAppToken from '../lib/getFacebookAppToken';
import getFbLongLiveToken from './getFacebookLongLiveToken';
import getFacebookUserProfile from '../lib/getFacebookUserProfile';
import generateToken from '../../libs/tokens/generateToken';
import hashToken from '../../libs/tokens/hashToken';

const { DB_NAME, COLL_USERS } = process.env;

/* create/get user from facebook accessToken */
export default async (userToken) => {
  const appToken = await getFbAppToken();
  const {
    accessToken,
    expiresAt,
    fbUserId,
  } = await getFbLongLiveToken(userToken, appToken);
  const client = await MongoClient.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
  });
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

/* eslint-disable import/no-relative-packages */
import uuidv4 from 'uuid/v4';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { getFacebookAppToken } from './getFacebookAppToken';
import { getFacebookLongLiveToken } from './getFacebookLongLiveToken';
import { getFacebookUserProfile } from './getFacebookUserProfile';
import { getFacebookSettings } from './getFacebookSettings';
import generateToken from '../../libs/tokens/generateToken';
import hashToken from '../../libs/tokens/hashToken';
import { checkAppPlanForLimitIncrease } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';
import { getAppActiveUsers } from '../../userMetrics/lib/getAppActiveUsers';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes.ts';
import { getApp } from '../../apps/lib/appsUtils.ts';
import syncUserRegisterBaserow from './backends/syncUserRegisterBaserow.ts';

const { COLL_USERS } = mongoCollections;

/* create/get user from facebook accessToken */
export const getUserByFacebook = async (userToken, appId) => {
  // get facebook app settings
  const settings = await getFacebookSettings(appId);
  const appToken = await getFacebookAppToken(settings);
  const { accessToken, expiresAt, fbUserId } = await getFacebookLongLiveToken(
    userToken,
    appToken,
    settings
  );
  const client = await MongoClient.connect();
  let userId; // will be retrieved from db or set on user created
  try {
    const app = await getApp(appId);
    const collection = await client.db().collection(COLL_USERS);
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
          appId,
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
      const allowed = await checkAppPlanForLimitIncrease(
        app,
        'activeUsers',
        async (appArg) => {
          const activeUsers = await getAppActiveUsers(appArg);

          return activeUsers.count;
        },
        { checkInDB: true }
      );

      if (!allowed) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
          `The current plan for app '${appId}' does not allow this operation`
        );
      }

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
        appId,
        services: {
          facebook: {
            accessToken,
            expiresAt,
            id: fbUserId,
            name: profile.username,
          },
          resume: {
            loginTokens: [
              {
                hashedToken: hash,
                when: date.toISOString(),
              },
            ],
          },
        },
      };
      await collection.insertOne(userDoc);

      await syncUserRegisterBaserow(userId, 'facebook');
    }
    return {
      userId,
      authToken: token,
    };
  } finally {
    client.close();
  }
};

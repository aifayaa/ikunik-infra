/* eslint-disable import/no-relative-packages */
import get from 'lodash/get';
import jwt from 'jsonwebtoken';
import request from 'request-promise-native';
import Random from '../../libs/account_utils/random.ts';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
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

export const getUserByApple = async (
  authorizationCode,
  _identityToken,
  appId,
  { fullName, email: userEmail } = {}
) => {
  // TODO:verify identityToken => https://developer.apple.com/documentation/signinwithapplerestapi/verifying_a_user

  const client = await MongoClient.connect();
  try {
    const db = client.db();
    const app = await getApp(appId);

    const { clientId, clientSecret } = get(app, 'credentials.apple');
    if (!clientId || !clientSecret) {
      throw new Error('missing_credentials');
    }

    // verify token given by client
    const verified = JSON.parse(
      await request({
        method: 'POST',
        uri: 'https://appleid.apple.com/auth/token',
        form: {
          grant_type: 'authorization_code',
          code: authorizationCode,
          client_id: clientId,
          client_secret: clientSecret,
        },
      })
    );

    const {
      access_token: accessToken,
      token_type: tokenType,
      refresh_token: refreshToken,
      id_token: idToken,
    } = verified;
    const {
      iss /* should always be "https://appleid.apple.com" */,
      aud /* client_id => same as packageId */,
      exp /* expire at */,
      /* iat, */
      sub /* userId */,
      /* at_hash, */
      email,
      /* email_verified, */
      /* auth_time, */
    } = jwt.decode(idToken);

    if (iss !== 'https://appleid.apple.com') {
      throw new Error('unexpected_iss');
    }
    /* check if a build is defined with packageId specified */
    if (app.builds.ios.packageId !== aud) {
      throw new Error('unexpected_aud');
    }

    /* get user in db */
    const collection = db.collection(COLL_USERS);
    const user = await collection.findOne(
      {
        'services.apple.userId': sub,
        appId,
      },
      { projection: { _id: true, 'profile.email': true } }
    );
    const token = generateToken();
    const hash = hashToken(token);
    const date = new Date();

    const finalEmail = userEmail || email;
    let userId;
    /* if user exist, update apple service */
    if (user) {
      userId = user._id;
      /* update accessToken and generate loginToken */
      const patch = {
        $set: {
          'services.apple.expiresAt': exp,
          'services.apple.accessToken': accessToken,
          'services.apple.tokenType': tokenType,
          'services.apple.refreshToken': refreshToken,
          'services.apple.idToken': idToken,
        },
        $addToSet: {
          'services.resume.loginTokens': {
            hashedToken: hash,
            when: date.toISOString(),
          },
        },
      };
      if ((!user.profile || !user.profile.email) && finalEmail) {
        patch.$set['profile.email'] = finalEmail;
      }
      await collection.updateOne({ _id: userId }, patch);
    } else {
      const allowed = await checkAppPlanForLimitIncrease(
        app,
        'activeUsers',
        async () => {
          const activeUsers = await getAppActiveUsers(app);

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
      const profile = {
        username:
          fullName.nickname || fullName.givenName || fullName.familyName
            ? `${fullName.givenName} ${fullName.familyName}`
            : finalEmail.split('@')[0],
        email: finalEmail,
      };

      userId = Random.id();
      const userDoc = {
        _id: userId,
        createdAt: date,
        profile,
        appId,
        services: {
          apple: {
            userId: sub,
            expiresAt: exp,
            accessToken,
            tokenType,
            refreshToken,
            idToken,
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

      await syncUserRegisterBaserow(userId, 'siwa');
    }
    return {
      userId,
      authToken: token,
    };
  } finally {
    client.close();
  }
};

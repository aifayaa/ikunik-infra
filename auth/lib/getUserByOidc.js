/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import verifyJwt from './verifyJsonWebToken';
import generateToken from '../../libs/tokens/generateToken';
import hashToken from '../../libs/tokens/hashToken';
import Random from '../../libs/account_utils/random.ts';
import { checkAppPlanForLimitIncrease } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';
import { getAppActiveUsers } from '../../userMetrics/lib/getAppActiveUsers';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes.ts';

const { COLL_USERS } = mongoCollections;

export const getUserByOidc = async (identityToken, appId) => {
  const client = await MongoClient.connect();
  try {
    // TODO: verify identityToken
    const decodedIdToken = await verifyJwt(identityToken, appId, {
      mongoClient: client,
    });
    const { sub, given_name: givenName, name } = decodedIdToken;

    if (!sub) {
      throw new Error('missing_sub');
    }

    const db = client.db();

    /* get user in db */
    const collection = db.collection(COLL_USERS);
    const user = await collection.findOne(
      {
        'services.openIdConnect.sub': sub,
        appId,
      },
      { projection: { _id: true } }
    );
    const token = generateToken();
    const hash = hashToken(token);
    const date = new Date();

    let userId;
    /* if user exist, update apple service */
    if (user) {
      userId = user._id;
      /* update accessToken and generate loginToken */

      const patch = {
        $set: {
          'services.openIdConnect.sub': sub,
          'services.openIdConnect.idToken': decodedIdToken,
          'profile.username': name || givenName,
        },
        $addToSet: {
          'services.resume.loginTokens': {
            hashedToken: hash,
            when: date.toISOString(),
          },
          appId,
        },
      };
      await collection.updateOne({ _id: userId }, patch);
    } else {
      const allowed = await checkAppPlanForLimitIncrease(
        appId,
        'activeUsers',
        async (app) => {
          const activeUsers = await getAppActiveUsers(app);

          return activeUsers.count;
        }
      );

      if (!allowed) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
          `The current plan for app '${appId}' does not allow this operation`
        );
      }

      userId = Random.id();
      /* create new user */
      const userDoc = {
        _id: userId,
        createdAt: new Date(),
        profile: {
          username: name || givenName,
        },
        services: {
          openIdConnect: {
            sub,
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
        appId,
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

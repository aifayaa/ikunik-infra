/* eslint-disable import/no-relative-packages */
// based on meteor accounts-password module
// createUser method from
// https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { wordpressRegister } from './backends/wordpressRegister';
import { crowdaaRegister } from './backends/crowdaaRegister.ts';
import syncUserRegisterBaserow from './backends/syncUserRegisterBaserow.ts';
import postLoginChecks from './postLoginChecks.ts';
import { checkAppPlanForLimitIncrease } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';
import { getAppActiveUsers } from '../../userMetrics/lib/getAppActiveUsers';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes.ts';

const { ADMIN_APP } = process.env;

const { COLL_APPS } = mongoCollections;

export const register = async (
  rawEmail,
  username,
  password,
  appId,
  { firstname, lastname } = {}
) => {
  const client = await MongoClient.connect();

  try {
    const appsCollection = client.db().collection(COLL_APPS);

    const app = await appsCollection.findOne({ _id: appId });
    if (!app) throw new Error('app_not_found');

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

    let ret;

    if (appId !== ADMIN_APP && app.backend) {
      switch (app.backend.type) {
        case 'wordpress':
          ret = await wordpressRegister(username, rawEmail, password, app);
          await syncUserRegisterBaserow(ret.userId, 'wordpress');
          break;
        default:
          throw new Error('unknown_backend');
      }
    } else {
      ret = await crowdaaRegister(username, rawEmail, password, app, {
        firstname,
        lastname,
      });

      await syncUserRegisterBaserow(ret.userId, 'crowdaa');
    }

    await postLoginChecks(ret, app, 'register');

    return ret;
  } finally {
    client.close();
  }
};

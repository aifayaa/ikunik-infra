/* eslint-disable import/no-relative-packages */
// based on meteor accounts-password module
// createUser method from
// https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { wordpressRegister } from './backends/wordpressRegister';
import { crowdaaRegister } from './backends/crowdaaRegister.ts';
import postLoginChecks from './postLoginChecks.ts';
import { checkAppPlanForLimitIncrease } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';

const { ADMIN_APP } = process.env;

const { COLL_APPS, COLL_USERS } = mongoCollections;

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
      appId,
      'appUsers',
      async () => {
        const usersCount = await client
          .db()
          .collection(COLL_USERS)
          .find({ appId })
          .count();

        return usersCount;
      }
    );

    if (!allowed) {
      throw new Error('app_limits_exceeded');
    }

    let ret;

    if (appId !== ADMIN_APP && app.backend) {
      switch (app.backend.type) {
        case 'wordpress':
          ret = await wordpressRegister(username, rawEmail, password, app);
          break;
        default:
          throw new Error('unknown_backend');
      }
    } else {
      ret = await crowdaaRegister(username, rawEmail, password, app, {
        firstname,
        lastname,
      });
    }

    await postLoginChecks(ret, app, 'register');

    return ret;
  } finally {
    client.close();
  }
};

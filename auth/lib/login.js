/* eslint-disable import/no-relative-packages */
// based on meteor accounts-password module
// createUser method from
// https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { crowdaaLogin } from './backends/crowdaaLogin.ts';
import { wordpressLogin } from './backends/wordpressLogin';
import postLoginChecks from './postLoginChecks.ts';

const { ADMIN_APP } = process.env;

const { COLL_APPS } = mongoCollections;

export const login = async (rawEmail, username, password, appId) => {
  const client = await MongoClient.connect();

  try {
    const appsCollection = client.db().collection(COLL_APPS);

    const app = await appsCollection.findOne({ _id: appId });
    if (!app) throw new Error('app_not_found');

    let ret;

    if (appId !== ADMIN_APP && app.backend) {
      switch (app.backend.type) {
        case 'wordpress':
          ret = wordpressLogin(username || rawEmail, password, app);
          break;
        default:
          throw new Error('unknown_backend');
      }
    } else {
      ret = await crowdaaLogin(username, rawEmail, password, app);
    }

    await postLoginChecks(ret, app, 'login');

    return ret;
  } finally {
    client.close();
  }
};

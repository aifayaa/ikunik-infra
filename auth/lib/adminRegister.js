// based on meteor accounts-password module
// createUser method from
// https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { crowdaaLogin } from './backends/crowdaaLogin';
import { crowdaaRegister } from './backends/crowdaaRegister';
import postLoginChecks from './postLoginChecks';

const {
  ADMIN_APP,
} = process.env;

const {
  COLL_APPS,
} = mongoCollections;

export const login = async ({
  email,
  username,
  password,
  profile,
}) => {
  const client = await MongoClient.connect();

  try {
    const appsCollection = client.db().collection(COLL_APPS);

    const app = await appsCollection.findOne({ _id: ADMIN_APP });
    if (!app) throw new Error('app_not_found');

    await crowdaaRegister(username, email, password, app, profile);

    const ret = await crowdaaLogin(username, email, password, app);

    await postLoginChecks(ret, app, 'admin-register');

    return (ret);
  } finally {
    client.close();
  }
};

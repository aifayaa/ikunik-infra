/* eslint-disable import/no-relative-packages */
// based on meteor accounts-password module
// createUser method from
// https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { UTMType, UserProfileType } from '../../users/lib/userEntity';
import { crowdaaLogin } from './backends/crowdaaLogin';
import { crowdaaRegister } from './backends/crowdaaRegister';
import syncAdminRegisterBaserow from './backends/syncAdminRegisterBaserow';
import postLoginChecks from './postLoginChecks';

const { ADMIN_APP } = process.env;

const { COLL_APPS } = mongoCollections;

export default async (email: string) => {
  const client = await MongoClient.connect();

  try {
    const appsCollection = client.db().collection(COLL_APPS);

    const app = await appsCollection.findOne({ _id: ADMIN_APP });
    if (!app) throw new Error('app_not_found');

    const ret = await crowdaaLogin('', email, '', app, {
      noPasswordCheck: true,
    });

    return ret;
  } finally {
    client.close();
  }
};

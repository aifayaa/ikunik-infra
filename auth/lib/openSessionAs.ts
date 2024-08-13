/* eslint-disable import/no-relative-packages */
// based on meteor accounts-password module
// createUser method from
// https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js

import {
  APP_NOT_FOUND_CODE,
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
} from '@libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { UTMType, UserProfileType, UserType } from '../../users/lib/userEntity';
import { crowdaaLogin } from './backends/crowdaaLogin';
import { crowdaaRegister } from './backends/crowdaaRegister';
import syncAdminRegisterBaserow from './backends/syncAdminRegisterBaserow';
import postLoginChecks from './postLoginChecks';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import { VALIDATION_FAILED_CODE } from '@libs/httpResponses/formatValidationErrors';

const { ADMIN_APP } = process.env;

const { COLL_APPS, COLL_USERS } = mongoCollections;

export type OpenSessionAsType = {
  email?: string;
  id?: string;
};

export default async ({ email, id }: OpenSessionAsType) => {
  const client = await MongoClient.connect();

  try {
    const appsCollection = client.db().collection(COLL_APPS);

    const app = await appsCollection.findOne({ _id: ADMIN_APP });
    if (!app)
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `Cannot find application with ID '${ADMIN_APP}'`
      );

    if (id) {
      const user = await client
        .db()
        .collection(COLL_USERS)
        .findOne({ _id: id, appId: ADMIN_APP });
      if (user) {
        const userEmail =
          user.emails && user.emails[0] && user.emails[0].address;
        if (userEmail) {
          email = userEmail;
        }
      }
    }

    if (email) {
      const ret = await crowdaaLogin('', email, '', app, {
        noPasswordCheck: true,
      });

      return ret;
    }

    throw new CrowdaaError(
      ERROR_TYPE_VALIDATION_ERROR,
      VALIDATION_FAILED_CODE,
      `Missing both ${id} and ${email} fields in the request`
    );
  } finally {
    client.close();
  }
};

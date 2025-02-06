/* eslint-disable import/no-relative-packages */
import { objGet, objUnset } from '../../libs/utils';
import Random from '../../libs/account_utils/random';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APPLICATION_OUTSIDE_ORGANIZATION_CODE,
  APP_NOT_FOUND_CODE,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_ORGANIZATION_CODE,
} from '../../libs/httpResponses/errorCodes';
import { AppInOrgType, AppType, OrganizationFieldUserType } from './appEntity';

const { COLL_APPS, COLL_USERS } = mongoCollections;

// type stripeSubcriptionStatusType = 'initial' | 'hold' | 'active';

// const allStripeSubcriptionStatusType = ['initial', 'hold', 'active'];

// // Use a type guard
// // Documentation:
// // https://blog.logrocket.com/how-to-use-type-guards-typescript/
// export function isStripeSubcriptionStatus(
//   status: string | stripeSubcriptionStatusType
// ): status is stripeSubcriptionStatusType {
//   return allStripeSubcriptionStatusType.includes(status);
// }

// export function getStripeSubscriptionMetadata(
//   status: stripeSubcriptionStatusType
// ): {
//   crowdaaStatus: stripeSubcriptionStatusType;
// } {
//   switch (status) {
//     case 'initial': {
//       return { crowdaaStatus: 'initial' };
//     }
//     case 'hold': {
//       return { crowdaaStatus: 'hold' };
//     }
//     case 'active': {
//       return { crowdaaStatus: 'active' };
//     }
//   }
// }

export async function getApp(
  appId: string,
  options: { dontThrow?: boolean } = { dontThrow: false }
) {
  const client = await MongoClient.connect();
  try {
    const db = client.db();
    const app = await db.collection(COLL_APPS).findOne({ _id: appId });

    if (!app && !options.dontThrow) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `The application '${appId}' is not found`
      );
    }

    return app;
  } finally {
    client.close();
  }
}

export const appPrivateFields = [
  'appleAccounts',
  'backend',
  'builds.android.firebase',
  'builds.android.googleApiData',
  'credentials.apple.clientSecret',
  'credentials.apple.expireTime',
  'credentials.apple.keyId',
  'credentials.chatengine.privateKey',
  'credentials.facebook.appSecret',
  'credentials.wordpressPlaylists.autoLoginToken',
  'credentials.wordpressPlaylists.email',
  'credentials.wordpressPlaylists.password',
  'credentials.wordpressPlaylists.sessionToken',
  'credentials.wordpressPlaylists.username',
  'firebaseProjectId',
  'settings.iap.googleLicenceKey',
  'settings.iap.appleSecret',
  'settings.platformApplicationArns',
  'settings.userDataCollection',

  // Not included/public, may be needed by the dashboard :
  // 'credentials.apple.clientId',
  // 'credentials.chatengine.publicKey',
  // 'credentials.facebook.appId',
  // 'credentials.facebook.permissions',
  // 'credentials.wordpressPlaylists.baseUrl',
];

export const appPrivateFieldsProjection = appPrivateFields.reduce(
  (acc, field) => {
    acc[field] = 0;
    return acc;
  },
  {} as { [key: string]: number }
);

export function filterAppPrivateFields(app: AppType) {
  // Deep duplication required to avoid modifying the source
  const ret = JSON.parse(JSON.stringify(app));

  appPrivateFields.forEach((field) => {
    objUnset(ret, field);
  });

  return ret;
}

export function getAppLockedFields(app: AppType) {
  return {
    androidName: !(
      !objGet(app, ['builds', 'android', 'ready']) &&
      (!objGet(app, ['builds', 'android', 'pipeline']) ||
        objGet(app, ['builds', 'android', 'pipeline', 'status']) === 'error')
    ),
    iosName: !(
      !objGet(app, ['builds', 'ios', 'ready']) &&
      (!objGet(app, ['builds', 'ios', 'pipeline']) ||
        objGet(app, ['builds', 'ios', 'pipeline', 'status']) === 'error')
    ),
  };
}

export function getAppDefaultBuildFields(name: string, platform: string) {
  const packageIdSuffix =
    Random.randomString(1, 'abcdefghijklmnopqrstuvwxyz') +
    Random.randomString(10, 'abcdefghijklmnopqrstuvwxyz0123456789');
  const packageId = `com.crowdaa.${packageIdSuffix}`;

  return {
    name,
    packageId,
    platform,
    repository: 'crowdaa_press_yui',
    author: 'Crowdaa',
    description: `Welcome on ${name} community app!`,
    email: 'support@crowdaa.com',
    version: '0.0.1',
    hotpushEnabled: 0,
  };
}

export function isApplicationInOrganization(app: AppType) {
  return (app.organization && app.organization._id) !== undefined;
}

export function assertApplicationInOrganization(app: AppType): AppInOrgType {
  if (!isApplicationInOrganization(app)) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_ALLOWED,
      APPLICATION_OUTSIDE_ORGANIZATION_CODE,
      `Application '${app._id}' is not in an organization`
    );
  }
  return app as AppInOrgType;
}

export function getApplicationOrganizationId(app: AppType) {
  const appOrgId = app.organization?._id;

  if (!appOrgId) {
    throw new CrowdaaError(
      ERROR_TYPE_VALIDATION_ERROR,
      MISSING_ORGANIZATION_CODE,
      `App '${app._id}' do not have an organization`
    );
  }

  return appOrgId;
}

async function keepOnlyAdminUser(users: Array<OrganizationFieldUserType>) {
  const usersId = users.map((user) => user._id);

  const client = await MongoClient.connect();
  const db = client.db();

  const adminUsersId = (
    await db
      .collection(COLL_USERS)
      .find(
        { _id: { $in: usersId }, appId: process.env.ADMIN_APP },
        { projection: { _id: 1 } }
      )
      .toArray()
  ).map((user: { _id: string }) => user._id);

  return users.filter((user) => adminUsersId.includes(user._id));
}

export async function getApplicationUsers(
  app: AppType,
  throwOnNoOrg: boolean = true
) {
  const users = app.organization?.users;

  if (!users) {
    if (throwOnNoOrg) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_ORGANIZATION_CODE,
        `App '${app._id}' do not have an organization`
      );
    } else {
      return [];
    }
  }

  return await keepOnlyAdminUser(users);
}

export function isAppAlreadyBuild(app: AppType) {
  const runningStates = ['queued', 'starting', 'running'];

  return (
    app &&
    app.builds &&
    ((app.builds.android &&
      // Either an Android version has been built
      (app.builds.android.ready ||
        // Or an Android version is building
        (app.builds.android.pipeline &&
          runningStates.includes(app.builds.android.pipeline.status)))) ||
      (app.builds.ios &&
        // Either an iOS version has been built
        (app.builds.ios.ready ||
          // Or an iOS version is building
          (app.builds.ios.pipeline &&
            runningStates.includes(app.builds.ios.pipeline.status)))))
  );
}

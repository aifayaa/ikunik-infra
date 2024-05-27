/* eslint-disable import/no-relative-packages */
import { objGet, objUnset } from '../../libs/utils';
import Random from '../../libs/account_utils/random';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APP_NOT_FOUND_CODE,
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_ORGANIZATION_CODE,
} from '../../libs/httpResponses/errorCodes';
import { AppType } from './appEntity';

const { COLL_APPS } = mongoCollections;

export async function getApp(appId: string): Promise<AppType> {
  const client = await MongoClient.connect();
  try {
    const db = client.db();
    const app = await db.collection(COLL_APPS).findOne({ _id: appId });

    if (!app) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `The application '${appId}' is not found`,
        {
          details: {
            appId,
          },
        }
      );
    }

    return app;
  } finally {
    client.close();
  }
}

export const appPrivateFields = [
  'credentials',
  'appleAccounts',
  'firebaseProjectId',
  'settings.iap',
  'settings.userDataCollection',
  'settings.platformApplicationArns',
  'backend',
  'builds.android.googleApiData',
  'builds.android.firebase',
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
  const packageIdSuffix = Random.randomString(
    11,
    'abcdefghijklmnopqrstuvwxyz0123456789'
  );
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
  };
}

export function isApplicationInOrganization(app: AppType) {
  return (app.organization && app.organization._id) !== undefined;
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

export function isAppAlreadyBuild(app: AppType) {
  return (
    app &&
    app.builds &&
    ((app.builds.android && app.builds.android.ready) ||
      (app.builds.ios && app.builds.ios.ready))
  );
}

/* eslint-disable import/no-relative-packages */
import { objGet, objUnset } from '../../libs/utils';
import Random from '../../libs/account_utils/random';

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
  {}
);

export function filterAppPrivateFields(app) {
  const ret = JSON.parse(JSON.stringify(app)); // Deep duplication required to avoid modifying the source

  appPrivateFields.forEach((field) => {
    objUnset(ret, field);
  });

  return ret;
}

export function getAppLockedFields(app) {
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

export function getAppDefaultBuildFields(name, platform) {
  const packageIdSuffix = Random.randomString(
    10,
    'abcdefghijklmnopqrstuvwxyz0123456789'
  );
  const packageId = `com.crowdaa.app.${packageIdSuffix}`;

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

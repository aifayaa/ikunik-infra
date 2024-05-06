/* eslint-disable import/no-relative-packages */
import { objUnset } from '../../libs/utils';

export const appPrivateFields = [
  'credentials',
  'appleAccounts',
  'firebaseProjectId',
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

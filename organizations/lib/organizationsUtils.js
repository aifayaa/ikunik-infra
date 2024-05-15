/* eslint-disable import/no-relative-packages */
import { objUnset } from '../../libs/utils';

export const userPrivateFields = ['services', 'perms', 'superAdmin'];

export const userPrivateFieldsProjection = userPrivateFields.reduce(
  (acc, field) => {
    acc[field] = 0;
    return acc;
  },
  {}
);

// TODO: Move to 'users/lib/usersUtils.js'
export function filterUserPrivateFields(app) {
  // Deep duplication required to avoid modifying the source
  const ret = JSON.parse(JSON.stringify(app));

  userPrivateFields.forEach((field) => {
    objUnset(ret, field);
  });

  return ret;
}

export const organizationRoles = ['owner', 'admin', 'member'];

export const applicationRolesInOrganization = [
  'admin',
  'editor',
  'moderator',
  'viewer',
];

// TODO: Move to 'apps/lib/appsUtils.js'
export function isAppAlreadyBuild(application) {
  return (
    application &&
    application.builds &&
    ((application.builds.android && application.builds.android.ready) ||
      (application.builds.ios && application.builds.ios.ready))
  );
}

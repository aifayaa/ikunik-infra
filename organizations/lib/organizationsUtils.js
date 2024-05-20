/* eslint-disable import/no-relative-packages */

// TODO: Delete this constant and use the one from 'usersUtils.js'
export const userPrivateFields = ['services', 'perms', 'superAdmin'];

// TODO: Delete this constant and use the one from 'usersUtils.js'
export const userPrivateFieldsProjection = userPrivateFields.reduce(
  (acc, field) => {
    acc[field] = 0;
    return acc;
  },
  {}
);

export const organizationRoles = ['owner', 'admin', 'member'];

export const applicationRolesInOrganization = [
  'admin',
  'editor',
  'moderator',
  'viewer',
];

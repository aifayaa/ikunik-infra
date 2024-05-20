/* eslint-disable import/no-relative-packages */

export const organizationRoles = ['owner', 'admin', 'member'];

export const applicationRolesInOrganization = [
  'admin',
  'editor',
  'moderator',
  'viewer',
];

const isNonEmptyString = (val) => typeof val === 'string' && val.length > 0;

export const createFieldChecks = {
  name(val) {
    return isNonEmptyString(val);
  },
};

export const putAppFieldChecks = {
  appId(val) {
    return isNonEmptyString(val);
  },
};

export const setOrgDebugPaidChecks = {
  paymentOk(val) {
    return typeof val === 'boolean';
  },
};

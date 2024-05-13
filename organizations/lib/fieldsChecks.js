/* eslint-disable import/no-relative-packages */
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

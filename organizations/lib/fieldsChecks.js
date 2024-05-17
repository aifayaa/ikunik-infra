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

export const returnedFieldsFilter = (org) => {
  const allowed = {
    _id: true,
    createdAt: true,
    createdBy: true,
    name: true,
    payment: (ct) =>
      ct ? { ok: !!ct.ok, setBy: ct.setBy, setAt: ct.setAt } : null,
  };

  const ret = Object.keys(org).reduce((acc, key) => {
    if (allowed[key] === true) {
      acc[key] = org[key];
    } else if (typeof allowed[key] === 'function') {
      const fn = allowed[key];
      acc[key] = fn(org[key]);
    }

    return acc;
  }, {});

  return ret;
};

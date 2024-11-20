/* eslint-disable import/no-relative-packages */
const isString = (val) => typeof val === 'string';
const isNonEmptyString = (val) => typeof val === 'string' && val.length > 0;
const isValidDate = (val) =>
  typeof val === 'string' && !Number.isNaN(new Date(val).getFullYear());

export const createFieldChecks = {
  title: isNonEmptyString,
  description: isString,
  startDate: isValidDate,
  endDate: isValidDate,
  options(val) {
    if (!(val instanceof Array)) {
      return false;
    }

    const good = val.every((item) => {
      const keysLength = Object.keys(item).length;
      if (keysLength !== 2) {
        return false;
      }

      if (!isNonEmptyString(item.id)) {
        return false;
      }
      if (!isNonEmptyString(item.text)) {
        return false;
      }

      return true;
    });

    return good;
  },
  requires(val) {
    return ['auth', 'none'].indexOf(val) >= 0;
  },
  multipleChoices(val) {
    return typeof val === 'boolean';
  },
  displayResults(val) {
    return typeof val === 'boolean';
  },
  canUpdate(val) {
    return typeof val === 'boolean';
  },
  active(val) {
    return typeof val === 'boolean';
  },
};

export const updateFieldChecks = {
  ...createFieldChecks,
};

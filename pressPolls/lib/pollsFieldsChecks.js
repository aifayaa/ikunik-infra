const isString = (val) => (typeof val === 'string');
const isNonEmptyString = (val) => (typeof val === 'string' && val.length > 0);
const isNumber = (val) => (typeof val === 'number');
const isValidDate = (val) => (typeof val === 'string' && !Number.isNaN((new Date(val)).getFullYear()));

const checkBadgesList = (val) => {
  if (!(val instanceof Array)) {
    return (false);
  }

  const good = val.every((item) => {
    if (!isNonEmptyString(item.id)) {
      return (false);
    }

    return (true);
  });

  return (good);
};

const checkBadgesAllow = (val) => (
  ['all', 'any'].indexOf(val) >= 0
);

export const createFieldChecks = {
  title: isNonEmptyString,
  description: isString,
  startDate: isValidDate,
  endDate: isValidDate,
  options(val) {
    if (!(val instanceof Array)) {
      return (false);
    }

    const good = val.every((item) => {
      const keysLength = Object.keys(item).length;
      if (keysLength !== 3) {
        return (false);
      }

      if (!isNonEmptyString(item.id)) {
        return (false);
      }
      if (!isNonEmptyString(item.text)) {
        return (false);
      }
      if (!isNumber(item.initialValue)) {
        return (false);
      }

      return (true);
    });

    return (good);
  },
  requires(val) {
    return (['auth', 'anon', 'none'].indexOf(val) >= 0);
  },
  badges(val) {
    if (typeof val !== 'object') {
      return (false);
    }

    if (Object.keys(val).length !== 2) {
      return (false);
    }
    if (!checkBadgesList(val.list)) {
      return (false);
    }
    if (checkBadgesAllow(val.allow)) {
      return (false);
    }

    return (true);
  },
  multipleChoices(val) {
    return (typeof val === 'boolean');
  },
  displayResults(val) {
    return (typeof val === 'boolean');
  },
  canUpdate(val) {
    return (typeof val === 'boolean');
  },
  publishedAt(val) {
    if (val === null) return (true);
    return (isValidDate(val));
  },
  active(val) {
    return (typeof val === 'boolean');
  },
};

export const updateFieldChecks = {
  ...createFieldChecks,
  'badges.list': checkBadgesList,
  'badges.allow': checkBadgesAllow,
};

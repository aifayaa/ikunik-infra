const isNonEmptyString = (val) => (typeof val === 'string' && val.length > 0);
const isNonNegativeNumber = (val) => (typeof val === 'number' && val >= 0);
const isValidDate = (val) => (val && !Number.isNaN((new Date(val)).getFullYear()));

export const createFieldChecks = {
  campaignId(val) {
    return (isNonEmptyString(val) || val === null);
  },
  media: isNonEmptyString,
  mediaType(val) {
    if (!isNonEmptyString(val)) return (false);

    switch (val) {
      case 'picture':
      case 'video':
        return (true);
      default:
        return (false);
    }
  },
  url: isNonEmptyString,
  location(val) {
    if (!isNonEmptyString(val)) return (false);

    switch (val) {
      case 'feed':
      case 'article':
        return (true);
      default:
        return (false);
    }
  },
  locationOpts(val) {
    return (typeof val === 'string');
  },
  limits(val) {
    if (val === undefined) return (true);
    if (typeof val !== 'object') return (false);

    const {
      maxDisplays,
      maxClicks,
      notBefore,
      notAfter,
    } = val;

    if (typeof maxDisplays !== 'number' && maxDisplays !== undefined) return (false);
    if (typeof maxDisplays === 'number' && maxDisplays < 0) return (false);
    if (typeof maxClicks !== 'number' && maxClicks !== undefined) return (false);
    if (typeof maxClicks === 'number' && maxClicks < 0) return (false);

    if (!notBefore && notBefore !== null && notBefore !== undefined) return (false);
    if (notBefore && Number.isNaN((new Date(notBefore)).getFullYear())) return (false);
    if (!notAfter && notAfter !== null && notAfter !== undefined) return (false);
    if (notAfter && Number.isNaN((new Date(notAfter)).getFullYear())) return (false);

    return (true);
  },
  counters(val) {
    if (val === undefined) return (true);
    if (typeof val !== 'object') return (false);

    const {
      displays,
      clicks,
    } = val;

    if (typeof displays !== 'number' && displays !== undefined) return (false);
    if (typeof displays === 'number' && displays < 0) return (false);
    if (typeof clicks !== 'number' && clicks !== undefined) return (false);
    if (typeof clicks === 'number' && clicks < 0) return (false);

    return (true);
  },
  active(val) {
    return (typeof val === 'boolean' || val === undefined);
  },
};

export const updateFieldChecks = {
  'limits.maxDisplays': isNonNegativeNumber,
  'limits.maxClicks': isNonNegativeNumber,
  'limits.notBefore': isValidDate,
  'limits.notAfter': isValidDate,

  'counters.displays': isNonNegativeNumber,
  'counters.clicks': isNonNegativeNumber,

  ...createFieldChecks,
};

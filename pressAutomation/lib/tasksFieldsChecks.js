/* eslint-disable import/no-relative-packages */
const isNonEmptyString = (val) => typeof val === 'string' && val.length > 0;
const isInteger = (val) => typeof val === 'number' && val === (val | 0);
const isStrictlyPositiveInteger = (val) => isInteger(val) && val > 0;
const isValidDate = (val) =>
  typeof val === 'string' && !Number.isNaN(new Date(val).getFullYear());

const allDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const allNewsCategories = [
  'business',
  'entertainment',
  'environment',
  'food',
  'health',
  'politics',
  'science',
  'sports',
  'technology',
  'top',
  'tourism',
  'world',
];

const allCountryCodes = [
  '*',
  'af',
  'al',
  'dz',
  'ao',
  'ar',
  'au',
  'at',
  'az',
  'bh',
  'bd',
  'bb',
  'by',
  'be',
  'bm',
  'bt',
  'bo',
  'ba',
  'br',
  'bn',
  'bg',
  'bf',
  'kh',
  'cm',
  'ca',
  'cv',
  'ky',
  'cl',
  'cn',
  'co',
  'km',
  'cr',
  'ci',
  'hr',
  'cu',
  'cy',
  'cz',
  'dk',
  'dj',
  'dm',
  'do',
  'cd',
  'ec',
  'eg',
  'sv',
  'ee',
  'et',
  'fj',
  'fi',
  'fr',
  'pf',
  'ga',
  'ge',
  'de',
  'gh',
  'gr',
  'gt',
  'gn',
  'ht',
  'hn',
  'hk',
  'hu',
  'is',
  'in',
  'id',
  'iq',
  'ie',
  'il',
  'it',
  'jm',
  'jp',
  'jo',
  'kz',
  'ke',
  'kw',
  'kg',
  'lv',
  'lb',
  'ly',
  'lt',
  'lu',
  'mo',
  'mk',
  'mg',
  'mw',
  'my',
  'mv',
  'ml',
  'mt',
  'mr',
  'mx',
  'md',
  'mn',
  'me',
  'ma',
  'mz',
  'mm',
  'na',
  'np',
  'nl',
  'nz',
  'ne',
  'ng',
  'kp',
  'no',
  'om',
  'pk',
  'pa',
  'py',
  'pe',
  'ph',
  'pl',
  'pt',
  'pr',
  'ro',
  'ru',
  'rw',
  'ws',
  'sm',
  'sa',
  'sn',
  'rs',
  'sg',
  'sk',
  'si',
  'sb',
  'so',
  'za',
  'kr',
  'es',
  'lk',
  'sd',
  'se',
  'ch',
  'sy',
  'tw',
  'tj',
  'tz',
  'th',
  'to',
  'tn',
  'tr',
  'tm',
  'ug',
  'ua',
  'ae',
  'gb',
  'us',
  'uy',
  'uz',
  've',
  'vi',
  'ye',
  'zm',
  'zw',
];

export const createFieldChecks = {
  name(val) {
    return isNonEmptyString(val);
  },
  query(val) {
    return typeof val === 'string';
  },
  startDateTime: isValidDate,
  endDateTime(val) {
    return isNonEmptyString(val) || val === null;
  },
  articlesCount: isStrictlyPositiveInteger,
  nextArticles: (val) => {
    if (!Array.isArray(val)) return false;

    const invalid = val.find((x) => {
      if (!x.title) return true;
      if (!x.content) return true;
      if (!x.pictureId) return true;
      return false;
    });

    if (invalid !== undefined) return false;

    return true;
  },
  fetchNewsSince: (val) => {
    if (!isInteger(val)) return false;
    if (val < 1 || val > 48) return false;
    return true;
  },
  action(val) {
    return ['reword', 'summarize'].indexOf(val) >= 0;
  },
  customPrompts(val) {
    if (typeof val !== 'object' || val === null) return false;
    return true;
  },
  autoPublish(val) {
    return typeof val === 'boolean' || val === undefined;
  },
  autoNotify(val) {
    return typeof val === 'boolean' || val === undefined;
  },
  categories(val) {
    if (!Array.isArray(val)) return false;
    if (val.length === 0) return false;

    const invalids = val.find((id) => !(id && typeof id === 'string'));
    if (invalids !== undefined) return false;

    return true;
  },
  newsCategory(val) {
    if (!val) return true;
    if (typeof val !== 'string') return false;

    const isValid = allNewsCategories.indexOf(val) >= 0;

    return isValid;
  },
  country(val) {
    if (!val) return true;
    if (typeof val !== 'string') return false;

    const isValid = allCountryCodes.indexOf(val) >= 0;

    return isValid;
  },
  recurrence(val) {
    if (typeof val !== 'object' || val === null) return false;

    if (!Array.isArray(val.days)) return false;
    if (!`${val.time}`.match(/^[0-9]{2}:[0-9]{2}:[0-9]{2}$/)) return false;

    const invalids = val.days.find((day) => allDays.indexOf(day) < 0);
    if (invalids !== undefined) return false;

    return true;
  },
  lang(val) {
    return ['en', 'fr'].indexOf(val) >= 0;
  },
  // countries(val) {
  //   if (!Array.isArray(val)) return (false);
  //   if (val.length === 0 || val.length > 5) return (false);
  //   const good = val.reduce((acc, cc) => {
  //     acc = acc && (allCountryCodes.indexOf(cc) >= 0);
  //     return (acc);
  //   }, true);
  //   return (good);
  // },
  active(val) {
    return typeof val === 'boolean' || val === undefined;
  },
};

export const updateFieldChecks = {
  ...createFieldChecks,
};

/* eslint-disable import/no-relative-packages */
import acceptLanguageParser from 'accept-language-parser';
import i18next from 'i18next';
import langFr from './translations/fr';
import langEn from './translations/en';

let isInit = false;
const resources = {
  fr: langFr,
  en: langEn,
};

export function formatMessage(...args) {
  return i18next.t(...args);
}

export function getUserLanguage(headers) {
  let lng = 'en';
  let acceptLanguageHeader;
  let acceptedLanguages;

  const found = Object.keys(headers).some((key) => {
    if (key.toLowerCase() === 'accept-language') {
      acceptLanguageHeader = headers[key];
      return true;
    }
    return false;
  });

  if (!found) {
    acceptedLanguages = 'en';
  } else {
    acceptedLanguages = acceptLanguageParser.parse(acceptLanguageHeader);
  }

  for (let i = 0; i < acceptedLanguages.length; i += 1) {
    if (resources[acceptedLanguages[i].code]) {
      lng = acceptedLanguages[i].code;
      break;
    }
  }

  return lng;
}

export async function intlInit(lng) {
  if (!isInit) {
    await i18next.init({
      lng,
      resources,
    });
    isInit = true;
  } else {
    await i18next.changeLanguage(lng);
  }
}

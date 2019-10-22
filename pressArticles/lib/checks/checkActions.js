import { URL } from 'url';

const stringIsAValidUrl = (s) => {
  try { return new URL(s); } catch (err) { return false; }
};

export default (actions) => {
  if (!Array.isArray(actions)) {
    throw new Error('mal_formed_request');
  }
  actions.forEach((action) => {
    if (!action.title || !action.url) {
      throw new Error('mal_formed_request');
    }
    if (!stringIsAValidUrl(action.url)) {
      throw new Error('URL error');
    }
  });
  return true;
};

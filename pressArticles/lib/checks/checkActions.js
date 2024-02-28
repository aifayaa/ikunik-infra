/* eslint-disable import/no-relative-packages */
import { actionRegexp } from '../../../libs/regexp/action';

export default (actions) => {
  if (!Array.isArray(actions)) {
    throw new Error('mal_formed_request');
  }
  actions.forEach((action) => {
    if (!action.title || !action.url) {
      throw new Error('action_field_missing');
    }
    if (!actionRegexp.test(action.url)) {
      throw new Error('invalid_action_url');
    }
  });
  return true;
};

/* eslint-disable import/no-relative-packages */
import { actionRegexp } from '../../libs/regexp/action';

const ACTIONS_LIST = [
  'callPhoneNumber',
  'composeEmail',
  'goToTab',
  'openArticle',
  'openPdf',
  'openUrl',
];

export default ({
  action_v2: actionV2,
  action,
  color,
  hidden,
  name,
  order,
  parentId,
  pathName,
  picture,
}) => {
  if (!name) {
    throw new Error('missing_argument');
  }

  [name, pathName, color, parentId, action].forEach((item) => {
    if (item && typeof item !== 'string') {
      throw new Error('wrong_argument_type');
    }
  });

  if (picture) {
    if (typeof picture !== 'object' || typeof picture.length === 'undefined') {
      throw new Error('wrong_argument_type');
    }

    if (picture.length > 1) {
      throw new Error('Cannot upload more than one picture');
    }
  }

  if (typeof hidden !== 'boolean') {
    throw new Error('wrong_argument_type');
  }

  if (color && !/^#(([0-9a-fA-F]{2}){3}|([0-9a-fA-F]){3})$/.test(color)) {
    throw new Error('Wrong color syntax, must be #xxxxxx');
  }

  if (order && typeof order !== 'number') {
    throw new Error('wrong_argument_type');
  }

  if (action) {
    if (!actionRegexp.test(action)) {
      throw new Error('invalid_action_url');
    }
  }

  if (actionV2) {
    if (typeof actionV2 !== 'object') {
      throw new Error('wrong_argument_type');
    }

    if (ACTIONS_LIST.indexOf(actionV2.type) < 0) {
      throw new Error('invalid_action_type');
    }

    if (!actionV2.target) {
      throw new Error('invalid_action_target');
    }
  }
};

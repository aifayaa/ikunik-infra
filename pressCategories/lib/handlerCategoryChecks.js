/* eslint-disable import/no-relative-packages */
import { actionRegexp } from '../../libs/regexp/action';

const { SAFE_ORDER_NUMBER } = process.env;
const safeOrderNumber = Number.parseInt(SAFE_ORDER_NUMBER, 10);

export default ({
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

  if (
    order &&
    (!Number.isInteger(order) || order < 1 || order >= safeOrderNumber)
  ) {
    throw new Error('Wrong order syntax, must be a positive integer');
  }

  if (action) {
    if (!actionRegexp.test(action)) {
      throw new Error('invalid_action_url');
    }
  }
};

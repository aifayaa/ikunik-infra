/* eslint-disable import/no-relative-packages */
import random from 'lodash/random';

// To avoid getting a warning with lint
const jsConsole = console;

export default () => {
  let pinCode = '';
  do {
    pinCode = Math.floor(random(0, 1, true) * 10000).toString();
  } while (pinCode.length !== 4);
  jsConsole.info('New pin code generated:', pinCode);
  return pinCode;
};

import random from 'lodash/random';
import winston from 'winston';

export default () => {
  let pinCode = '';
  do {
    pinCode = Math.floor(random(0, 1, true) * 10000).toString();
  } while (pinCode.length !== 4);
  winston.info('New pin code generated:', pinCode);
  return pinCode;
};

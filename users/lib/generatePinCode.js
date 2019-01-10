import random from 'lodash/random';

export default () => {
  let pinCode = '';
  do {
    pinCode = Math.floor(random(0, 1, true) * 10000).toString();
  } while (pinCode.length !== 4);
  console.info('New pin code generated:', pinCode);
  return pinCode;
};

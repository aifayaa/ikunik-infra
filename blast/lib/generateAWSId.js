/* eslint-disable import/no-relative-packages */
import crypto from 'crypto';

export default () =>
  [8, 4, 4, 4, 8]
    .map((i) => crypto.randomBytes(i))
    .map((id) => id.toString('hex'))
    .join('-');

/* eslint-disable import/no-relative-packages */
import crypto from 'crypto';

const LENGTH = 22;

export default (length) => crypto.randomBytes(length || LENGTH).toString('hex');

/* eslint-disable import/no-relative-packages */
import crypto from 'crypto';

export default (loginToken: string) => {
  const hash = crypto.createHash('sha256');
  hash.update(loginToken);
  return hash.digest('base64');
};

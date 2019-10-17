import crypto from 'crypto';

export default (loginToken) => {
  const hash = crypto.createHash('sha256');
  hash.update(loginToken);
  return hash.digest('base64');
};

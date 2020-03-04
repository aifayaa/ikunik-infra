import jwt from 'jsonwebtoken';

/**
 * Check if token is a valide JWT by trying to parse it
 * and retrive parsed token
 *
 * @param {string} token
 * @return {boolean}
 */
export default (token) => {
  try {
    const parsedToken = jwt.decode(token);
    return !!parsedToken;
  } catch (e) {
    return false;
  }
};

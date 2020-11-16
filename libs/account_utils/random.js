/*
  Based on meteor accounts-password module
  createUser method from
  https://github.com/meteor/meteor/blob/devel/packages/random/random.js

  The MIT License (MIT)

  Copyright (c) 2011 - present Meteor Software Ltd.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

  ====================================================================
  This license applies to all code in Meteor that is not an externally
  maintained library. Externally maintained libraries have their own
  licenses, included in the LICENSES directory.
  ====================================================================
*/
import nodeCrypto from 'crypto';

// We use cryptographically strong PRNGs (crypto.getRandomBytes() on the server,
// window.crypto.getRandomValues() in the browser) when available. If these
// PRNGs fail, we fall back to the Alea PRNG, which is not cryptographically
// strong, and we seed it with various sources such as the date, Math.random,
// and window size on the client.  When using crypto.getRandomValues(), our
// primitive is hexString(), from which we construct fraction(). When using
// window.crypto.getRandomValues() or alea, the primitive is fraction and we use
// that to construct hex string.

const UNMISTAKABLE_CHARS = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz';
const BASE64_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';

/**
 * @name Random.hexString
 * @summary Return a random string of `n` hexadecimal digits.
 * @locus Anywhere
 * @param {Number} n Length of the string
 */
const hexString = (digits) => {
  const numBytes = Math.ceil(digits / 2);
  let bytes;
  // Try to get cryptographically strong randomness. Fall back to
  // non-cryptographically strong if not available.
  try {
    bytes = nodeCrypto.randomBytes(numBytes);
  } catch (e) {
    // XXX should re-throw any error except insufficient entropy
    bytes = nodeCrypto.pseudoRandomBytes(numBytes);
  }
  const result = bytes.toString('hex');
  // If the number of digits is odd, we'll have generated an extra 4 bits
  // of randomness, so we need to trim the last digit.
  return result.substring(0, digits);
};

/**
 * @name Random.fraction
 * @summary Return a number between 0 and 1, like `Math.random`.
 * @locus Anywhere
 */
const fraction = () => {
  const numerator = parseInt(hexString(8), 16);
  return numerator * 2.3283064365386963e-10; // 2^-32
};

/**
 * @name Random.choice
 * @summary Return a random element of the given array or string.
 * @locus Anywhere
 * @param {Array|String} arrayOrString Array or string to choose from
 */
const choice = (arrayOrString) => {
  const index = Math.floor(fraction() * arrayOrString.length);
  if (typeof arrayOrString === 'string') return arrayOrString.substr(index, 1);
  return arrayOrString[index];
};

const randomString = (charsCount, alphabet) => {
  const digits = [];
  for (let i = 0; i < charsCount; i += 1) {
    digits[i] = choice(alphabet);
  }
  return digits.join('');
};

/**
 * @name Random.id
 * @summary Return a unique identifier, such as `"Jjwjg6gouWLXhMGKW"`, that is
 * likely to be unique in the whole world.
 * @locus Anywhere
 * @param {Number} [n] Optional length of the identifier in characters
 *   (defaults to 17)
 */
const id = (charsCount) => {
  // 17 characters is around 96 bits of entropy, which is the amount of
  // state in the Alea PRNG.
  if (charsCount === undefined) charsCount = 17;

  return randomString(charsCount, UNMISTAKABLE_CHARS);
};

/**
 * @name Random.secret
 * @summary Return a random string of printable characters with 6 bits of
 * entropy per character. Use `Random.secret` for security-critical secrets
 * that are intended for machine, rather than human, consumption.
 * @locus Anywhere
 * @param {Number} [n] Optional length of the secret string (defaults to 43
 *   characters, or 256 bits of entropy)
 */
const secret = (charsCount) => {
  // Default to 256 bits of entropy, or 43 characters at 6 bits per
  // character.
  if (charsCount === undefined) charsCount = 43;
  return randomString(charsCount, BASE64_CHARS);
};

export default {
  choice,
  fraction,
  hexString,
  id,
  randomString,
  secret,
};

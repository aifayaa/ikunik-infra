/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

/*
  from meteor string_utils
   https://github.com/meteor/meteor/blob/devel/packages/meteor/string_utils.js
*/
const escapeRegExp = (string) =>
  String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/*
  based on meteor accounts-password module
  method generateCasePermutationsForString from
  https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js
*/
const generateCasePermutationsForString = (string) => {
  // Generates permutations of all case variations of a given string.
  let permutations = [''];
  for (let i = 0; i < string.length; i += 1) {
    const ch = string.charAt(i);
    permutations = [].concat(
      ...permutations.map((prefix) => {
        const lowerCaseChar = ch.toLowerCase();
        const upperCaseChar = ch.toUpperCase();
        // Don't add unneccesary permutations when ch is not a letter
        if (lowerCaseChar === upperCaseChar) {
          return [prefix + ch];
        }
        return [prefix + lowerCaseChar, prefix + upperCaseChar];
      })
    );
  }
  return permutations;
};

/*
  based on meteor accounts-password module
  method selectorForFastCaseInsensitiveLookup from
  https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js
*/
const selectorForFastCaseInsensitiveLookup = (fieldName, string, appId) => {
  // Performance seems to improve up to 4 prefix characters
  const prefix = string.substring(0, Math.min(string.length, 4));
  const orClause = generateCasePermutationsForString(prefix).map(
    (prefixPermutation) => {
      const selector = {};
      selector[fieldName] = new RegExp(`^${escapeRegExp(prefixPermutation)}`);
      return selector;
    }
  );
  const caseInsensitiveClause = {};
  caseInsensitiveClause[fieldName] = new RegExp(
    `^${escapeRegExp(string)}$`,
    'i'
  );
  return {
    $and: [{ $or: orClause }, caseInsensitiveClause, { appId }],
  };
};

/*
  based on meteor accounts-password module
  method checkForCaseInsensitiveDuplicates from
  https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js
*/
export default async (
  appId,
  fieldName,
  displayName,
  fieldValue,
  { errorMessage, mongoClient, ownUserId } = {}
) => {
  if (fieldValue) {
    const noClient = !mongoClient;

    if (noClient) {
      // initiate mongodb connection if no client given in options
      mongoClient = await MongoClient.connect();
    }
    try {
      const matchedUsers = await mongoClient
        .db()
        .collection(COLL_USERS)
        .find(
          selectorForFastCaseInsensitiveLookup(fieldName, fieldValue, appId)
        )
        .toArray();

      if (
        matchedUsers.length > 0 &&
        // If we don't have a userId yet, any match we find is a duplicate
        (!ownUserId ||
          // Otherwise, check to see if there are multiple matches or a match
          // that is not us
          matchedUsers.length > 1 ||
          matchedUsers[0]._id !== ownUserId)
      ) {
        throw new Error(errorMessage || `${displayName} already exists.`);
      }
    } finally {
      if (noClient) {
        mongoClient.close();
      }
    }
  }
};

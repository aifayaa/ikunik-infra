#!/usr/bin/env node
/* eslint-disable no-console */

const STAGE = process.argv[2];
let EXTRA = process.argv[3];
const AVAILABLE_STAGES = ['dev', 'preprod', 'prod', 'awaxDev', 'awax'];

if (!(AVAILABLE_STAGES.indexOf(STAGE) + 1)) {
  console.log('usage : ./prepare.js [STAGE] [EXTRA]\n');
  console.log('  STAGE can be dev, prod, awaxDev, awax');
  console.log('  EXTRA is a comma-separated list of extra operations to do. It can have :');
  console.log('    - remove : Checks and removes database indexes that we did not list in this script');
  console.log('    - verbose : Display extra information about what is being done');
  console.log('    - dry : Don\'t run any database operation');
  console.log('    - force : Force creation/update of existing indexes');
  process.exit(1);
}

// Set options as a parameter, environment variable, or rc file.
const fs = require('fs');
const yaml = require('js-yaml');
module.require = require('esm')(module/* , options */);

const isEqual = require('lodash/isEqual');
const { default: MongoClient } = require('./libs/mongoClient');

function objEquals(obj1, obj2) {
  if (Object.keys(obj1).length !== Object.keys(obj2).length) {
    return (false);
  }

  return !(Object.keys(obj1).some(
    (k) => (obj1[k] !== obj2[k]),
  ));
}

function objInclude(smallObj, bigObj) {
  if (Object.keys(smallObj).length > Object.keys(bigObj).length) {
    return (false);
  }

  return !(Object.keys(smallObj).some(
    (k) => !isEqual(smallObj[k], bigObj[k]),
  ));
}

function removeUndefinedValues(obj) {
  const ret = {};

  Object.keys(obj).forEach((v) => {
    if (obj[v] !== undefined) {
      ret[v] = obj[v];
    }
  });

  return (ret);
}

function makeOpts(...params) {
  let ret = {
    sparse: undefined,
    unique: undefined,
    partialFilterExpression: undefined,
  };

  for (let i = 0; i < params.length; i += 1) {
    if (typeof params[i] === 'string') {
      ret[params[i]] = true;
    } else if (typeof params[i] === 'object') {
      ret = { ...ret, ...params[i] };
    }
  }

  return (ret);
}

if (EXTRA) {
  EXTRA = EXTRA.split(',').map((v) => v.trim()).reduce((result, item) => {
    result[item] = true;
    return result;
  }, {});
} else {
  EXTRA = {};
}

let logTitle = '-';
function setTitle(title) {
  logTitle = title;
}

function log(...params) {
  console.log(`${logTitle} >`, ...params);
}

function verbose(...params) {
  if (EXTRA.verbose) {
    log(...params);
  }
}

async function processCollection(collection, indexSchemas) {
  const collIndexes = await collection.indexes();
  const promises = [];

  setTitle(`Collection ${collection.collectionName}`);

  if (EXTRA.remove) {
    for (let j = 0; j < collIndexes.length; j += 1) {
      let exists = false;

      if (!objEquals(collIndexes[j].key, { _id: 1 })) {
        for (let i = 0; i < indexSchemas.length; i += 1) {
          if (
            objEquals(indexSchemas[i].key, collIndexes[j].key) &&
            objInclude(indexSchemas[i].opts, collIndexes[j])
          ) {
            exists = true;
            break;
          }
        }

        if (!exists) {
          verbose('Removing index', collIndexes[j].name, collIndexes[j]);
          if (!EXTRA.dry) {
            promises.push(collection.dropIndex(collIndexes[j].name));
          }
        }
      }
    }

    if (!EXTRA.dry) {
      if (promises.length > 0) {
        await Promise.all(promises);
      } else {
        verbose('Nothing to remove');
      }
    }
    promises.splice(0);
  }

  for (let i = 0; i < indexSchemas.length; i += 1) {
    let found = false;
    const cleanedOptions = removeUndefinedValues(indexSchemas[i].opts);

    for (let j = 0; j < collIndexes.length; j += 1) {
      if (
        objEquals(indexSchemas[i].key, collIndexes[j].key) &&
        objInclude(indexSchemas[i].opts, collIndexes[j])
      ) {
        found = collIndexes[j];
        break;
      }
    }

    if (found && found.name !== indexSchemas[i].name) {
      verbose('Renaming index', indexSchemas[i].key, cleanedOptions);
      if (!EXTRA.dry) {
        promises.push(collection.dropIndex(found.name).then(() => collection.createIndex(
          indexSchemas[i].key,
          {
            ...cleanedOptions,
            name: indexSchemas[i].name,
          },
        )));
      }
    } else if (!found || EXTRA.force) {
      verbose('Creating index', indexSchemas[i].key, cleanedOptions);
      if (!EXTRA.dry) {
        promises.push(collection.createIndex(
          indexSchemas[i].key,
          {
            ...cleanedOptions,
            name: indexSchemas[i].name,
          },
        ));
      }
    }
  }

  if (!EXTRA.dry) {
    if (promises.length > 0) {
      await Promise.all(promises);
    } else {
      verbose('Nothing to create or rename');
    }
  } else {
    log('Dry mode, nothing was done');
  }
}

(async () => {
  const apiServerlessConfig = fs.readFileSync('./api-v1/serverless.yml', 'utf8');
  const envConfig = fs.readFileSync('./env.yml', 'utf8');
  const apiServerlessData = yaml.safeLoad(apiServerlessConfig);
  const envData = yaml.safeLoad(envConfig);

  const mongoUrl = apiServerlessData.custom.mongoDB[STAGE];

  const promises = [];
  const client = await MongoClient.connect(mongoUrl);

  const {
    COLL_USERS,
    DB_NAME,
  } = envData;

  try {
    const indexSchemas = {
      [COLL_USERS]: [
        /* Crowdaa indexes */
        { name: 'crowdaa_username_search', key: { appId: 1, username: 1 }, opts: makeOpts('sparse') },

        /**
         * These IDs with partialFilterExpression can also be used as search index,
         * only when the subset of selected elements matches the given expressions.
         * See : https://docs.mongodb.com/manual/core/index-partial/#query-coverage
         */
        {
          name: 'crowdaa_appid_email_unique',
          key: { appId: 1, 'emails.address': 1 },
          opts: makeOpts('unique', { partialFilterExpression: {
            'emails.address': { $exists: true },
          } }),
        },
        {
          name: 'crowdaa_appid_facebookid_unique',
          key: { appId: 1, 'services.facebook.id': 1 },
          opts: makeOpts('unique', { partialFilterExpression: {
            appId: { $exists: true },
            'services.facebook.id': { $exists: true },
          } }),
        },
        {
          name: 'crowdaa_appid_instagramid_unique',
          key: { appId: 1, 'services.instagram.id': 1 },
          opts: makeOpts('unique', { partialFilterExpression: {
            appId: { $exists: true },
            'services.instagram.id': { $exists: true },
          } }),
        },
        {
          name: 'crowdaa_appid_twitterid_unique',
          key: { appId: 1, 'services.twitter.id': 1 },
          opts: makeOpts('unique', { partialFilterExpression: {
            appId: { $exists: true },
            'services.twitter.id': { $exists: true },
          } }),
        },

        { name: 'crowdaa_email_validationtoken_unique', key: { 'emails.validationTokens.token': 1 }, opts: makeOpts('unique', 'sparse') },
        { name: 'crowdaa_sv_email_verificationtoken_unique', key: { 'services.email.verificationTokens.token': 1 }, opts: makeOpts('unique', 'sparse') },
        { name: 'crowdaa_sv_email_passwordresettoken_unique', key: { 'services.password.reset.token': 1 }, opts: makeOpts('unique', 'sparse') },
        { name: 'crowdaa_location_loc_search', key: { 'location.loc': '2dsphere' }, opts: makeOpts() },
        { name: 'crowdaa_sv_accesstoken_search', key: { 'services.accessTokens.tokens.hashedToken': 1 }, opts: makeOpts() },

        {
          name: 'crowdaa_facebook_exp_mod_access_search',
          key: {
            'services.facebook.expiresAt': 1,
            'profile.fbModifiedAt': 1,
            'services.facebook.accessToken': 1,
          },
          opts: makeOpts(),
        },

        /* Meteor indexes */
        { name: 'meteor_resume_hashtoken_unique', key: { 'services.resume.loginTokens.hashedToken': 1 }, opts: makeOpts('unique', 'sparse') },
        { name: 'meteor_resume_token_unique', key: { 'services.resume.loginTokens.token': 1 }, opts: makeOpts('unique', 'sparse') },
        { name: 'meteor_resume_haveloginstodelete_search', key: { 'services.resume.haveLoginTokensToDelete': 1 }, opts: makeOpts('sparse') },
        { name: 'meteor_resume_logintokens_when', key: { 'services.resume.loginTokens.when': 1 }, opts: makeOpts('sparse') },
        { name: 'meteor_password_reset_when_search', key: { 'services.password.reset.when': 1 }, opts: makeOpts('sparse') },
      ],
    };

    const collNames = Object.keys(indexSchemas);
    for (let i = 0; i < collNames.length; i += 1) {
      const collName = collNames[i];
      const collection = client.db(DB_NAME).collection(collName);
      // eslint-disable-next-line no-await-in-loop
      promises.push(processCollection(collection, indexSchemas[collName]));
    }

    await Promise.all(promises);
  } catch (error) {
    setTitle('Error');
    log(error);
    process.exitCode = 2;
  } finally {
    client.forceCloseThisConnectionNow();
  }
})();

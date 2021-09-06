#!/usr/bin/env node
/* eslint-disable no-console */

const STAGE = process.argv[2];
const REGION = process.argv[3];
let EXTRA = process.argv[4];
const AVAILABLE_STAGES_REGIONS = [
  'dev:us-east-1',
  'preprod:eu-west-3',
  'prod:us-east-1',
  'prod:eu-west-3',
  'awaxDev:eu-west-1',
  'awax:eu-west-1',
];
const { CI_FIRST_DEPLOY } = process.env;

if (!(AVAILABLE_STAGES_REGIONS.indexOf(`${STAGE}:${REGION}`) + 1)) {
  const stageRegionsDisplayList = AVAILABLE_STAGES_REGIONS
    .map((x) => (x.replace(':', ' + ')))
    .join(', ');
  console.log('usage : ./prepare.js [STAGE] [REGION] [EXTRA]\n');
  console.log(`  STAGE + REGION are mandatory and can be : ${stageRegionsDisplayList}`);
  console.log('  EXTRA is a comma-separated list of extra operations to do. It may contain :');
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
const omitBy = require('lodash/omitBy');
const isUndefined = require('lodash/isUndefined');
const { default: MongoClient } = require('./libs/mongoClient');

/**
 * Checks whether the smaller object is included in the bigger one.
 * We cannot use lodash/isMatch here since we also want to compare undefined values, for example :
 *     ({ x: undefined }, {})
 * shall be true, but :
 *     ({ x: undefined }, { x: 2 })
 * shall be false. And we need to test for equality, inside the root object. It's because of
 * the behavior of makeOpts, which returns all possible options, and they all need to be tested.
 * Deeper tests should be stric equals however, so we can use isEqual.
 * @param {object} smallObj A smaller object
 * @param {object} bigObj A bigger object
 */
function objInclude(smallObj, bigObj) {
  return !(Object.keys(smallObj).some(
    (k) => !isEqual(smallObj[k], bigObj[k]),
  ));
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

function makeLogger(initialTitle) {
  let logTitle = initialTitle || '-';

  const logObject = {
    setTitle(title) {
      logTitle = title;
    },
    log(...params) {
      console.log(`${logTitle} >`, ...params);
    },
    verbose(...params) {
      if (EXTRA.verbose) {
        logObject.log(...params);
      }
    },
  };

  return (logObject);
}

const {
  setTitle,
  log,
  verbose,
} = makeLogger();

async function processCollection(db, collName, indexSchemas) {
  const logger = makeLogger(`Collection ${collName}`);

  if (CI_FIRST_DEPLOY === 'true') {
    try {
      logger.verbose(`Attempting to create collection ${collName}`);
      if (!EXTRA.dry) {
        await db.createCollection(collName);
      }
    } catch (e) {
      logger.verbose(`Collection creation failed for ${collName}, maybe it already exists?`);
    }
  }

  const collection = db.collection(collName);
  const collIndexes = await collection.indexes();
  const promises = [];

  if (EXTRA.remove) {
    for (let j = 0; j < collIndexes.length; j += 1) {
      let exists = false;

      if (!isEqual(collIndexes[j].key, { _id: 1 })) {
        for (let i = 0; i < indexSchemas.length; i += 1) {
          if (
            isEqual(indexSchemas[i].key, collIndexes[j].key) &&
            objInclude(indexSchemas[i].opts, collIndexes[j])
          ) {
            exists = true;
            break;
          }
        }

        if (!exists) {
          logger.verbose('Removing index', collIndexes[j].name, collIndexes[j]);
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
        logger.verbose('Nothing to remove');
      }
    }
    promises.splice(0);
  }

  for (let i = 0; i < indexSchemas.length; i += 1) {
    let found = false;
    const cleanedOptions = omitBy(indexSchemas[i].opts, isUndefined);

    for (let j = 0; j < collIndexes.length; j += 1) {
      if (
        isEqual(indexSchemas[i].key, collIndexes[j].key) &&
        objInclude(indexSchemas[i].opts, collIndexes[j])
      ) {
        found = collIndexes[j];
        break;
      }
    }

    if (found && found.name !== indexSchemas[i].name) {
      logger.verbose('Renaming index', indexSchemas[i].key, cleanedOptions);
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
      logger.verbose('Creating index', indexSchemas[i].key, cleanedOptions);
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
      logger.verbose('Nothing to create or rename');
    }
  } else {
    logger.log('Dry mode, nothing was done');
  }
}

verbose(`Preparing database with parameters : ${STAGE} ${REGION} ${JSON.stringify(EXTRA)}`);

(async () => {
  const apiServerlessConfig = fs.readFileSync('./api-v1/serverless.yml', 'utf8');
  const envConfig = fs.readFileSync('./env.yml', 'utf8');
  const apiServerlessData = yaml.safeLoad(apiServerlessConfig);
  const envData = yaml.safeLoad(envConfig);

  const mongoUrl = apiServerlessData.custom.mongoDB[STAGE][REGION];

  const promises = [];
  const client = await MongoClient.connect(mongoUrl);

  const {
    COLL_APPS,
    COLL_PUSH_NOTIFICATIONS,
    COLL_USERS,
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
            'services.facebook.id': { $exists: true },
          } }),
        },
        {
          name: 'crowdaa_appid_instagramid_unique',
          key: { appId: 1, 'services.instagram.id': 1 },
          opts: makeOpts('unique', { partialFilterExpression: {
            'services.instagram.id': { $exists: true },
          } }),
        },
        {
          name: 'crowdaa_appid_twitterid_unique',
          key: { appId: 1, 'services.twitter.id': 1 },
          opts: makeOpts('unique', { partialFilterExpression: {
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
        {
          name: 'crowdaa_login_hashtoken_unique',
          key: { appId: 1, 'services.resume.loginTokens.hashedToken': 1 },
          opts: makeOpts('unique', { partialFilterExpression: {
            'services.resume.loginTokens.hashedToken': { $exists: true },
            appId: { $exists: true },
          } }),
        },
        {
          name: 'crowdaa_apitoken_hashtoken_appid',
          key: { appId: 1, 'services.apiTokens.hashedToken': 1 },
          opts: makeOpts('unique', { partialFilterExpression: {
            'services.apiTokens.hashedToken': { $exists: true },
            appId: { $exists: true },
          } }),
        },
        {
          name: 'crowdaa_apitoken_hashtoken',
          key: { 'services.apiTokens.hashedToken': 1 },
          opts: makeOpts('unique', 'sparse'),
        },

        /* Meteor indexes */
        { name: 'meteor_resume_hashtoken_unique', key: { 'services.resume.loginTokens.hashedToken': 1 }, opts: makeOpts('unique', 'sparse') },
        { name: 'meteor_resume_token_unique', key: { 'services.resume.loginTokens.token': 1 }, opts: makeOpts('unique', 'sparse') },
        { name: 'meteor_resume_haveloginstodelete_search', key: { 'services.resume.haveLoginTokensToDelete': 1 }, opts: makeOpts('sparse') },
        { name: 'meteor_resume_logintokens_when', key: { 'services.resume.loginTokens.when': 1 }, opts: makeOpts('sparse') },
        { name: 'meteor_password_reset_when_search', key: { 'services.password.reset.when': 1 }, opts: makeOpts('sparse') },
      ],
      [COLL_PUSH_NOTIFICATIONS]: [
        { name: 'crowdaa_blast_query_1', key: { userId: 1, appId: 1 }, opts: makeOpts() },
        { name: 'crowdaa_blast_query_2', key: { deviceUUID: 1, appId: 1 }, opts: makeOpts() },
      ],
      [COLL_APPS]: [
        { name: 'crowdaa_app_preview_key', key: { 'settings.previewKey': 1 }, opts: makeOpts('unique', 'sparse') },
      ],
    };

    const collNames = Object.keys(indexSchemas);
    const db = client.db();
    for (let i = 0; i < collNames.length; i += 1) {
      const collName = collNames[i];
      promises.push(processCollection(db, collName, indexSchemas[collName]));
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

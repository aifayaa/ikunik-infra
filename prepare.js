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

if (!(AVAILABLE_STAGES_REGIONS.indexOf(`${STAGE}:${REGION}`) + 1)) {
  const stageRegionsDisplayList = AVAILABLE_STAGES_REGIONS.map((x) =>
    x.replace(':', ' + ')
  ).join(', ');
  console.log('usage : ./prepare.js [STAGE] [REGION] [EXTRA]\n');
  console.log(
    `  STAGE + REGION are mandatory and can be : ${stageRegionsDisplayList}`
  );
  console.log(
    '  EXTRA is a comma-separated list of extra operations to do. It may contain :'
  );
  console.log(
    '    - remove : Checks and removes database indexes that we did not list in this script'
  );
  console.log(
    '    - verbose : Display extra information about what is being done'
  );
  console.log(
    "    - dry : Don't run any database write operation except creating collections that are not found"
  );
  console.log('    - force : Force creation/update of existing indexes');
  process.exit(1);
}

// Set options as a parameter, environment variable, or rc file.
module.require = require('esm')(module /* , options */);

const isEqual = require('lodash/isEqual');
const omitBy = require('lodash/omitBy');
const isUndefined = require('lodash/isUndefined');
const { default: MongoClient } = require('./libs/mongoClient.ts');
const mongoCollections = require('./libs/mongoCollections.json');
const apiServerlessData = require('./api-v1/serverless');

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
  return !Object.keys(smallObj).some((k) => !isEqual(smallObj[k], bigObj[k]));
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

  return ret;
}

/**
 * That function is required since the ORDER of elements also matters to mongodb.
 * Javascript has no guarantee of the order of its elements, but nodejs currently does.
 * AFAIK, this is not in the specs of nodejs, though, so we're lucky if it stays that way.
 */
function isStrictEqual(o1, o2) {
  return JSON.stringify(o1) === JSON.stringify(o2);
}

function filterTextKeys(opts) {
  const ret = { ...opts };
  const keys = Object.keys(ret).filter((k) => {
    if (ret[k] === 'text') return true;
    return false;
  });

  if (keys.length === 0) {
    return ret;
  }

  keys.forEach((key) => {
    delete ret[key];
  });

  // eslint-disable-next-line no-underscore-dangle
  ret._fts = 'text';
  // eslint-disable-next-line no-underscore-dangle
  ret._ftsx = 1;

  return ret;
}

if (EXTRA) {
  EXTRA = EXTRA.split(',')
    .map((v) => v.trim())
    .reduce((result, item) => {
      result[item] = true;
      return result;
    }, {});
} else {
  EXTRA = {};
}

function makeLogger(initialTitle) {
  let logTitle = initialTitle ? `${initialTitle} >` : '>';

  const logObject = {
    setTitle(title) {
      logTitle = title ? `${title} > ` : '';
    },
    log(...params) {
      console.log(`${logTitle}`, ...params);
    },
    verbose(...params) {
      if (EXTRA.verbose) {
        logObject.log(...params);
      }
    },
  };

  return logObject;
}

const { setTitle, log, verbose } = makeLogger();

async function processCollection(db, collName, indexSchemas) {
  const logger = makeLogger(`Collection ${collName}`);

  await db.createCollection(collName);

  const collection = db.collection(collName);
  const collIndexes = await collection.indexes();
  const promises = [];

  if (EXTRA.remove) {
    for (let j = 0; j < collIndexes.length; j += 1) {
      let exists = false;

      if (!isStrictEqual(collIndexes[j].key, { _id: 1 })) {
        for (let i = 0; i < indexSchemas.length; i += 1) {
          const filteredTextKeys = filterTextKeys(indexSchemas[i].key);
          if (
            isStrictEqual(filteredTextKeys, collIndexes[j].key) &&
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
    const filteredTextKeys = filterTextKeys(indexSchemas[i].key);

    for (let j = 0; j < collIndexes.length; j += 1) {
      if (
        isStrictEqual(filteredTextKeys, collIndexes[j].key) &&
        objInclude(indexSchemas[i].opts, collIndexes[j])
      ) {
        found = collIndexes[j];
        break;
      }
    }

    if (found && found.name !== indexSchemas[i].name) {
      logger.verbose('Renaming index', filteredTextKeys, cleanedOptions);
      if (!EXTRA.dry) {
        promises.push(
          collection.dropIndex(found.name).then(() =>
            collection.createIndex(indexSchemas[i].key, {
              ...cleanedOptions,
              name: indexSchemas[i].name,
            })
          )
        );
      }
    } else if (!found || EXTRA.force) {
      logger.verbose('Creating index', indexSchemas[i].key, cleanedOptions);
      if (!EXTRA.dry) {
        promises.push(
          collection.createIndex(indexSchemas[i].key, {
            ...cleanedOptions,
            name: indexSchemas[i].name,
          })
        );
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

verbose(
  `Preparing database with parameters : ${STAGE} ${REGION} ${JSON.stringify(EXTRA)}`
);

(async () => {
  const mongoUrl = apiServerlessData.custom.mongoDB[STAGE][REGION];

  const promises = [];
  const client = await MongoClient.connect(mongoUrl);

  const {
    COLL_ADVERTISEMENTS,
    COLL_APPS,
    COLL_COUNTERS,
    COLL_EXTERNAL_PURCHASES,
    COLL_PICTURES,
    COLL_PRESS_ARTICLES,
    COLL_PRESS_CATEGORIES,
    COLL_PRESS_DRAFTS,
    COLL_PUSH_NOTIFICATIONS,
    COLL_USERS,
    COLL_USER_METRICS,
    COLL_USER_REACTIONS,
  } = mongoCollections;

  try {
    const indexSchemas = {
      [COLL_USERS]: [
        /* Crowdaa indexes */
        {
          name: 'crowdaa_username_search',
          key: { appId: 1, username: 1 },
          opts: makeOpts('sparse'),
        },

        /**
         * These IDs with partialFilterExpression can also be used as search index,
         * only when the subset of selected elements matches the given expressions.
         * See : https://docs.mongodb.com/manual/core/index-partial/#query-coverage
         */
        {
          name: 'crowdaa_appid_email_unique',
          key: { appId: 1, 'emails.address': 1 },
          opts: makeOpts('unique', {
            partialFilterExpression: {
              'emails.address': { $exists: true },
            },
          }),
        },
        {
          name: 'crowdaa_appid_facebookid_unique',
          key: { appId: 1, 'services.facebook.id': 1 },
          opts: makeOpts('unique', {
            partialFilterExpression: {
              'services.facebook.id': { $exists: true },
            },
          }),
        },
        {
          name: 'crowdaa_appid_instagramid_unique',
          key: { appId: 1, 'services.instagram.id': 1 },
          opts: makeOpts('unique', {
            partialFilterExpression: {
              'services.instagram.id': { $exists: true },
            },
          }),
        },
        {
          name: 'crowdaa_appid_twitterid_unique',
          key: { appId: 1, 'services.twitter.id': 1 },
          opts: makeOpts('unique', {
            partialFilterExpression: {
              'services.twitter.id': { $exists: true },
            },
          }),
        },

        {
          name: 'crowdaa_email_validationtoken_unique',
          key: { 'emails.validationTokens.token': 1 },
          opts: makeOpts('unique', 'sparse'),
        },
        {
          name: 'crowdaa_sv_email_verificationtoken_unique',
          key: { 'services.email.verificationTokens.token': 1 },
          opts: makeOpts('unique', 'sparse'),
        },
        {
          name: 'crowdaa_sv_email_passwordresettoken_unique',
          key: { 'services.password.reset.token': 1 },
          opts: makeOpts('unique', 'sparse'),
        },
        {
          name: 'crowdaa_location_loc_search',
          key: { 'location.loc': '2dsphere' },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_sv_accesstoken_search',
          key: { 'services.accessTokens.tokens.hashedToken': 1 },
          opts: makeOpts(),
        },

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
          opts: makeOpts('unique', {
            partialFilterExpression: {
              'services.resume.loginTokens.hashedToken': { $exists: true },
              appId: { $exists: true },
            },
          }),
        },
        {
          name: 'crowdaa_apitoken_hashtoken_appid',
          key: { appId: 1, 'services.apiTokens.hashedToken': 1 },
          opts: makeOpts('unique', {
            partialFilterExpression: {
              'services.apiTokens.hashedToken': { $exists: true },
              appId: { $exists: true },
            },
          }),
        },
        {
          name: 'crowdaa_apitoken_hashtoken',
          key: { 'services.apiTokens.hashedToken': 1 },
          opts: makeOpts('unique', 'sparse'),
        },

        /* Meteor indexes */
        {
          name: 'meteor_resume_hashtoken_unique',
          key: { 'services.resume.loginTokens.hashedToken': 1 },
          opts: makeOpts('unique', 'sparse'),
        },
        {
          name: 'meteor_resume_token_unique',
          key: { 'services.resume.loginTokens.token': 1 },
          opts: makeOpts('unique', 'sparse'),
        },
        {
          name: 'meteor_resume_haveloginstodelete_search',
          key: { 'services.resume.haveLoginTokensToDelete': 1 },
          opts: makeOpts('sparse'),
        },
        {
          name: 'meteor_resume_logintokens_when',
          key: { 'services.resume.loginTokens.when': 1 },
          opts: makeOpts('sparse'),
        },
        {
          name: 'meteor_password_reset_when_search',
          key: { 'services.password.reset.when': 1 },
          opts: makeOpts('sparse'),
        },
      ],
      [COLL_PUSH_NOTIFICATIONS]: [
        {
          name: 'crowdaa_blast_query_1',
          key: { userId: 1, appId: 1 },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_blast_query_2',
          key: { deviceUUID: 1, appId: 1 },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_blast_single_1',
          key: { Token: 1, PlatformApplicationArn: 1, appId: 1 },
          opts: makeOpts(),
        },
      ],
      [COLL_APPS]: [
        {
          name: 'crowdaa_app_preview_key',
          key: { 'settings.previewKey': 1 },
          opts: makeOpts('unique', 'sparse'),
        },
      ],
      [COLL_PRESS_CATEGORIES]: [
        {
          name: 'crowdaa_categories_hidden',
          key: { appId: 1, hidden: 1 },
          opts: makeOpts(),
        },
      ],
      [COLL_PRESS_ARTICLES]: [
        {
          name: 'crowdaa_articles_search_dashboard',
          key: {
            appId: 1,
            trashed: 1,
            categoryId: 1,
          },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_articles_search_text',
          key: {
            appId: 1,
            isPublished: 1,
            title: 'text',
            md: 'text',
          },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_articles_search_public',
          key: {
            appId: 1,
            trashed: 1,
            hideFromFeed: 1,
            categoryId: 1,
            categoriesId: 1,
            pinned: -1,
            publicationDate: -1,
          },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_articles_search_public2',
          key: {
            appId: 1,
            trashed: 1,
            hideFromFeed: 1,
            categoryId: 1,
            categoriesId: 1,
            pinned: -1,
            eventStartDate: -1,
          },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_articles_stats',
          key: {
            appId: 1,
            isPublished: 1,
            publicationDate: 1,
          },
          opts: makeOpts('sparse'),
        },
      ],
      [COLL_PRESS_DRAFTS]: [
        {
          name: 'crowdaa_drafts_by_articleid',
          key: {
            articleId: 1,
            appId: 1,
          },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_drafts_by_ancestor',
          key: {
            ancestor: 1,
            appId: 1,
          },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_drafts_dashboard',
          key: {
            articleId: 1,
            createdAt: -1,
          },
          opts: makeOpts(),
        },
      ],
      [COLL_USER_METRICS]: [
        {
          name: 'location_2dsphere',
          key: { location: '2dsphere' },
          opts: makeOpts({ background: true, '2dsphereIndexVersion': 3 }),
        },
        {
          name: 'crowdaa_userMetrics_query1',
          key: {
            appId: 1,
            contentCollection: 1,
            type: 1,
            trashed: 1,
          },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_userMetrics_query2',
          key: {
            appId: 1,
            deviceId: 1,
            userId: 1,
          },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_userMetrics_query_mau1',
          key: {
            appId: 1,
            createdAt: 1,
          },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_userMetrics_query_mau2',
          key: {
            appId: 1,
            updatedAt: 1,
          },
          opts: makeOpts('sparse'),
        },
      ],
      [COLL_PICTURES]: [
        {
          name: 'crowdaa_pictures_appid',
          key: { appId: 1 },
          opts: makeOpts(),
        },
        {
          name: 'profil_ID_1_project_ID_1',
          key: { profil_ID: 1, project_ID: 1 },
          opts: makeOpts({ background: true }),
        },
      ],
      [COLL_EXTERNAL_PURCHASES]: [
        {
          name: 'crowdaa_extPurchases_lookup',
          key: {
            appId: 1,
            collection: 1,
            userId: 1,
            itemId: 1,
          },
          opts: makeOpts('unique'),
        },
        {
          name: 'crowdaa_extPurchases_auth_insert',
          key: {
            appId: 1,
            collection: 1,
            source: 1,
            userId: 1,
          },
          opts: makeOpts(),
        },
      ],
      [COLL_ADVERTISEMENTS]: [
        {
          name: 'crowdaa_adverts_lookup',
          key: {
            appId: 1,
            location: 1,
            active: 1,
            'limits.notAfter': 1,
            'limits.notBefore': 1,
            'remaining.clicks': 1,
            'remaining.displays': 1,
          },
          opts: makeOpts(),
        },
      ],
      [COLL_COUNTERS]: [
        {
          name: 'crowdaa_counters_key',
          key: {
            appId: 1,
            type: 1,
            name: 1,
          },
          opts: makeOpts('unique'),
        },
      ],
      [COLL_USER_REACTIONS]: [
        {
          name: 'crowdaa_user_reactions_key',
          key: {
            appId: 1,
            targetCollection: 1,
            targetId: 1,
            userId: 1,
            reactionType: 1,
            reactionName: 1,
            reactionAt: 1,
          },
          opts: makeOpts('unique'),
        },
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

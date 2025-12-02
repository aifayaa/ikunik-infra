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
];

const AVAILABLE_OPTIONS = {
  remove:
    'Checks and removes database indexes that we did not list in this script',
  removeviews:
    'Checks and removes database views that we did not list in this script',
  recreateviews: 'Removes existing views (if needed) before recreating them',
  verbose: 'Display extra information about what is being done',
  dry: 'Do not run any database write operation except creating collections that are not found',
  force: 'Force creation/update of existing indexes',
};

if (!(AVAILABLE_STAGES_REGIONS.indexOf(`${STAGE}:${REGION}`) + 1)) {
  const stageRegionsDisplayList = AVAILABLE_STAGES_REGIONS.map(
    (x) => `    - ${x.replace(':', ' + ')}`
  ).join('\n');
  console.log('usage : ./prepare.js [STAGE] [REGION] [EXTRA]\n');
  console.log(
    `  STAGE + REGION are mandatory and can be :\n${stageRegionsDisplayList}`
  );
  console.log(
    '  EXTRA is a comma-separated list of extra operations to do. It may contain :'
  );
  Object.keys(AVAILABLE_OPTIONS).forEach((key) => {
    console.log(`    - ${key} : ${AVAILABLE_OPTIONS[key]}`);
  });
  console.log('');
  console.log(
    'Note that views will NOT be updated until recreateviews is specified. It should be handled manually only and never automated since it implies a heavy processing'
  );
  process.exit(1);
}

// Set options as a parameter, environment variable, or rc file.
module.require = require('esm')(module /* , options */);

const isEqual = require('lodash/isEqual');
const omitBy = require('lodash/omitBy');
const isUndefined = require('lodash/isUndefined');
const { default: MongoClient } = require('./libs/mongoClient');
const mongoCollections = require('./libs/mongoCollections.json');
const mongoViews = require('./libs/mongoViews.json');
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

async function removeUnknownViews(viewsList, allCollections) {
  const logger = makeLogger('Unknown views remover');

  logger.log('Checking for unknown views...');

  const indexedViews = viewsList.reduce((acc, { name }) => {
    acc[name] = true;

    return acc;
  }, {});

  const promises = allCollections.map(async (coll) => {
    const options = await coll.options();

    if (options.viewOn && options.pipeline) {
      if (!indexedViews[coll.collectionName]) {
        logger.log(`Removing unknown view ${coll.collectionName}`);
        if (!EXTRA.dry) {
          await coll.drop();
        }
      }
    }
  });

  await Promise.all(promises);
}

async function processView(db, viewData, allCollections) {
  const { name, viewOn, pipeline } = viewData;
  const logger = makeLogger(`View ${name}`);

  const existingCollection = allCollections.find(
    (coll) => coll.collectionName === name
  );

  if (!existingCollection) {
    logger.log('Creating view');
    if (!EXTRA.dry) {
      await db.createCollection(name, {
        viewOn,
        pipeline,
      });
    }
  } else {
    logger.log('View exists');
    if (EXTRA.recreateviews) {
      // collMod operation is not allowed by MongoDB Atlas, so we need to handle it this way.
      logger.log('Deleting and Re-Creating view');
      if (!EXTRA.dry) {
        await existingCollection.drop();
        await db.createCollection(name, {
          viewOn,
          pipeline,
        });
      }
    }
  }
}

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

  const client = await MongoClient.connect(mongoUrl);

  const {
    COLL_ADVERTISEMENTS,
    COLL_APP_LIVE_STREAMS_LOGS,
    COLL_APP_LIVE_STREAMS_TOKENS,
    COLL_APPS,
    COLL_BLAST_NOTIFICATIONS_QUEUE,
    COLL_COUNTERS,
    COLL_EXTERNAL_PURCHASES,
    COLL_GHANTY_MYFID_USERS_STARS,
    COLL_LIVE_STREAMS_DURATIONS,
    COLL_NOTIFICATIONS,
    COLL_PICTURES,
    COLL_PRESS_ARTICLES_CACHE,
    COLL_PRESS_ARTICLES,
    COLL_PRESS_CATEGORIES,
    COLL_PRESS_DRAFTS,
    COLL_PUSH_NOTIFICATIONS,
    COLL_SENT_NOTIFICATIONS,
    COLL_USER_GENERATED_CONTENTS,
    COLL_USER_METRICS,
    COLL_USER_REACTIONS,
    COLL_USERS,
  } = mongoCollections;

  const { VIEW_USER_METRICS_UUID_AGGREGATED } = mongoViews;
  // const { VIEW_USER_METRICS_WITH_USERS } =
  //   mongoViews;

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
          name: 'crowdaa_appid_profile_email',
          key: { appId: 1, 'profile.email': 1 },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_perms_org_id',
          key: { 'perms.organizations._id': 1 },
          opts: makeOpts('sparse'),
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
          name: 'crowdaa_appid_appleid_unique',
          key: { appId: 1, 'services.apple.userId': 1 },
          opts: makeOpts('unique', {
            partialFilterExpression: {
              'services.apple.userId': { $exists: true },
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
        {
          name: 'crowdaa_user_wordpress_email',
          key: { appId: 1, 'services.wordpress.userEmail': 1 },
          opts: makeOpts({
            partialFilterExpression: {
              'services.wordpress.userEmail': { $exists: true },
              appId: { $exists: true },
            },
          }),
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
        {
          name: 'crowdaa_perms',
          key: {
            appId: 1,
            perms: 1,
          },
          opts: makeOpts('sparse'),
        },
      ],
      [COLL_SENT_NOTIFICATIONS]: [
        {
          name: 'crowdaa_sent_notifs_ugc_auto',
          key: { appId: 1, deviceId: 1, type: 1, sentAt: 1 },
          opts: makeOpts(),
        },
      ],
      [COLL_PUSH_NOTIFICATIONS]: [
        {
          name: 'crowdaa_blast_query_1',
          key: { appId: 1, userId: 1 },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_blast_query_2',
          key: { appId: 1, deviceUUID: 1 },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_blast_single_1',
          key: { appId: 1, Token: 1, PlatformApplicationArn: 1 },
          opts: makeOpts(),
        },
      ],
      [COLL_APPS]: [
        {
          name: 'crowdaa_apps_preview_key',
          key: { 'settings.previewKey': 1 },
          opts: makeOpts('unique', 'sparse'),
        },
        {
          name: 'crowdaa_apps_org_id',
          key: { 'organization._id': 1 },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_apps_ios_sns_renewing',
          key: {
            'settings.platformApplicationArns.iOS.arn': 1,
            'settings.platformApplicationArns.iOS.expiresAt': 1,
            'settings.platformApplicationArns.iOS.retryAfter': 1,
          },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_apps_ios_builds_status',
          key: {
            'builds.ios.pipeline.status': 1,
            'builds.ios.pipeline._id': 1,
            'builds.ios.ready': 1,
          },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_apps_android_builds_status',
          key: {
            'builds.android.pipeline.status': 1,
            'builds.android.pipeline._id': 1,
            'builds.android.ready': 1,
          },
          opts: makeOpts('sparse'),
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
          opts: makeOpts({
            background: true,
            weights: {
              title: 5,
              md: 1,
            },
          }),
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
      [COLL_PRESS_ARTICLES_CACHE]: [
        {
          name: 'crowdaa_articles_cache_main',
          key: {
            appId: 1,
            type: 1,
          },
          opts: makeOpts('unique'),
        },
      ],
      [COLL_PRESS_DRAFTS]: [
        {
          name: 'crowdaa_drafts_by_appid',
          key: {
            appId: 1,
          },
          opts: makeOpts(),
        },
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
      [VIEW_USER_METRICS_UUID_AGGREGATED]: [
        {
          name: 'location_2dsphere',
          key: {
            appId: 1,
            type: 1,
            'metricsGeoLast.location': '2dsphere',
          },
          opts: makeOpts({ background: true, '2dsphereIndexVersion': 3 }),
        },
        {
          name: 'crowdaa_articles_search_text',
          key: {
            appId: 1,
            'user.profile.username': 'text',
            'user.profile.firstname': 'text',
            'user.profile.lastname': 'text',
            'user.profile.email': 'text',
            'emails.address': 'text',
          },
          opts: makeOpts('sparse', {
            background: true,
          }),
        },
        {
          name: 'crowdaa_articles_search_fields',
          key: {
            appId: 1,
            type: 1,
            'user.profile.username': 1,
            'user.profile.firstname': 1,
            'user.profile.lastname': 1,
            'user.profile.email': 1,
            'emails.address': 1,
          },
          opts: makeOpts('sparse', {
            background: true,
          }),
        },
        {
          name: 'crowdaa_userMetrics_search_all1',
          key: {
            appId: 1,
            firstMetricAt: 1,
          },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_userMetrics_search_all2',
          key: {
            appId: 1,
            lastMetricAt: 1,
          },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_userMetrics_search_all3',
          key: {
            appId: 1,
            readingTime: 1,
          },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_mongodb_atlas_suggested_1',
          key: {
            appId: 1,
            lastMetricAt: -1,
            metricsGeoLast: 1,
          },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_mongodb_atlas_suggested_2',
          key: {
            appId: 1,
            deviceId: 1,
            type: 1,
          },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_mongodb_atlas_suggested_3',
          key: {
            appId: 1,
            type: 1,
            userId: 1,
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
          name: 'crowdaa_userMetrics_query_mau1', // TODO Check if useless with new mau3
          key: {
            appId: 1,
            createdAt: 1,
          },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_userMetrics_query_mau2', // TODO Check if useless with new mau3
          key: {
            appId: 1,
            updatedAt: 1,
          },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_userMetrics_query_mau3',
          key: {
            appId: 1,
            userId: 1,
            createdAt: 1,
            updatedAt: 1,
          },
          opts: makeOpts('sparse'),
        },
        {
          name: 'crowdaa_userMetrics_atlas_suggested_1',
          key: {
            appId: 1,
            contentCollection: 1,
            type: 1,
            trashed: 1,
            createdAt: -1,
            deviceId: 1,
          },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_userMetrics_atlas_suggested_2',
          key: {
            appId: 1,
            contentCollection: 1,
            type: 1,
            trashed: 1,
            createdAt: -1,
            userId: 1,
          },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_userMetrics_userId',
          key: {
            userId: 1,
          },
          opts: makeOpts('sparse'),
        },
      ],
      [COLL_PICTURES]: [
        {
          name: 'crowdaa_pictures_appid_created',
          key: {
            appId: 1,
            createdAt: 1,
          },
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
      [COLL_USER_GENERATED_CONTENTS]: [
        {
          name: 'crowdaa_suggested_atlas_1',
          key: {
            appId: 1,
            rootParentCollection: 1,
            rootParentId: 1,
            type: 1,
            trashed: 1,
            moderated: 1,
            reviewed: 1,
          },
          opts: makeOpts(),
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
          },
          opts: makeOpts('unique'),
        },
        {
          name: 'crowdaa_mongodb_atlas_suggested_1',
          key: {
            appId: 1,
            reactionType: 1,
            targetCollection: 1,
            targetId: 1,
          },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_mongodb_atlas_suggested_2',
          key: {
            appId: 1,
            reactionName: 1,
            reactionType: 1,
            targetCollection: 1,
            targetId: 1,
          },
          opts: makeOpts(),
        },
      ],
      [COLL_APP_LIVE_STREAMS_TOKENS]: [
        {
          name: 'crowdaa_live_stream_duration_update_key',
          key: {
            liveStreamId: 1,
            appId: 1,
            deviceId: 1,
            userId: 1,
          },
          opts: makeOpts(),
        },
      ],
      [COLL_APP_LIVE_STREAMS_LOGS]: [
        {
          name: 'crowdaa_aals_logs_awsId_uniq',
          key: {
            awsId: 1,
          },
          opts: makeOpts('unique'),
        },
        {
          name: 'crowdaa_aals_logs_search1',
          key: {
            appId: 1,
            liveStreamId: 1,
            sendTime: 1,
          },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_aals_logs_insert_key',
          key: {
            appId: 1,
            awsStreamId: 1,
            s3bucket: 1,
            s3Key: 1,
          },
          opts: makeOpts(),
        },
      ],
      [COLL_LIVE_STREAMS_DURATIONS]: [
        {
          name: 'crowdaa_live_stream_duration_update_key',
          key: {
            appId: 1,
            type: 1,
            liveStreamId: 1,
            awsStreamId: 1,
          },
          opts: makeOpts(),
        },
        {
          name: 'crowdaa_live_stream_duration_read_key',
          key: {
            appId: 1,
            startTime: 1,
            endTime: 1,
          },
          opts: makeOpts('sparse'),
        },
      ],
      [COLL_BLAST_NOTIFICATIONS_QUEUE]: [
        {
          name: 'crowdaa_mongodb_atlas_suggested_1',
          key: {
            appId: 1,
            queueId: 1,
            root: 1,
          },
          opts: makeOpts(),
        },
      ],
      [COLL_GHANTY_MYFID_USERS_STARS]: [
        {
          name: 'crowdaa_ghany_users_stars_unique',
          key: {
            username: 1,
          },
          opts: makeOpts('unique'),
        },
        {
          name: 'crowdaa_ghanty_users_stars_sort',
          key: {
            requiresUpdate: -1,
          },
          opts: makeOpts(),
        },
      ],
      [COLL_NOTIFICATIONS]: [
        {
          name: 'crowdaa_uniq_user_push',
          key: {
            appId: 1,
            blastQueueId: 1,
            target: 1,
            userId: 1,
          },
          opts: makeOpts('unique', {
            partialFilterExpression: {
              target: 'user',
            },
          }),
        },
      ],
    };

    // All keys here will be prefixed with VIEWS_PREFIX
    // All views are processed in order, to allow views based on other views
    const viewsList = [
      // {
      //   name: VIEW_USER_METRICS_WITH_USERS,
      //   viewOn: COLL_USER_METRICS,
      //   pipeline: [
      //     {
      //       $lookup: {
      //         from: COLL_USERS,
      //         localField: 'userId',
      //         foreignField: '_id',
      //         as: 'user',
      //       },
      //     },
      //     {
      //       $unwind: {
      //         path: '$user',
      //         preserveNullAndEmptyArrays: true,
      //       },
      //     },
      //   ],
      // },
    ];

    const db = client.db();

    log('Fetching all collections');
    const allCollections = await db.collections();

    log('Processing views');
    for (let i = 0; i < viewsList.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await processView(db, viewsList[i], allCollections);
    }

    if (EXTRA.removeviews) {
      await removeUnknownViews(viewsList, allCollections);
    }

    const promises = [];
    log('Processing indexes');
    Object.keys(indexSchemas).forEach((collName) => {
      promises.push(processCollection(db, collName, indexSchemas[collName]));
    });

    await Promise.all(promises);
  } catch (error) {
    setTitle('Error');
    log(error);
    process.exitCode = 2;
  } finally {
    client.forceCloseThisConnectionNow();
  }
})();

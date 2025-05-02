/* eslint-disable import/no-relative-packages */
import uuid from 'uuid';
import MongoClient from '../../libs/mongoClient';
import Random from '../../libs/account_utils/random.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import syncCreateAppBaserow from './syncCreateAppBaserow';
import { getAppDefaultBuildFields } from './appsUtils.ts';
import { objSet } from '../../libs/utils';
import { DEFAULT_NEW_APP_PLAN_ID } from '../../appsFeaturePlans/lib/getCurrentPlan.ts';

const { ADMIN_APP } = process.env;

const { COLL_APPS, COLL_USERS, COLL_PICTURES } = mongoCollections;

export const DEFAULT_APP_SETTINGS = {
  press: {
    aiModerationEnabled: true,
    chatNotificationsEnabled: true,
    moderationRequired: false,
    ugcAutoNotifications: {
      enabled: false,
      interval: 86400,
      maxPerInterval: 4,
    },
    env: {
      apiKeyCanBeChanged: false,
      articleFromCommunityDateFormat: 'lll',
      articleFromFeedDateFormat: 'lll',
      biometrics: false,
      categoryArticleDateFormat: 'L',
      communityArticleCommentsEnabled: true,
      communityArticleDateFormat: 'L',
      communityArticleShareEnabled: true,
      displayArticleAuthor: false,
      displayArticleCommentsCount: true,
      displayArticleLikesViews: true,
      displayPopularCategories: true,
      displayTabsNames: true,
      feedArticleCommentsEnabled: true,
      feedArticleDateFormat: 'L',
      feedArticleShareEnabled: true,
      forgotPasswordEnabled: true,
      geolocation: true,
      isBeta: false,
      keycloakClient: '',
      keycloakRealm: '',
      keycloakUrl: '',
      loginArticleRequired: false,
      loginWithUsername: false,
      phoneRegisterEnabled: false,
      phoneRegisterRequired: false,
      registerWithCrowdaa: true,
      reversedFeed: false,
      signInWithApple: false,
      signInWithCrowdaa: true,
      signInWithFacebook: false,
      signInWithSAML: false,
      startTab: 'today',
      tabOrder: 'today,categories,community,search,settings',
    },
  },
};

async function addUserAsAppOwner(db, userId, appId) {
  await db.collection(COLL_USERS).updateOne(
    { _id: userId },
    {
      $push: {
        'perms.apps': {
          _id: appId,
          roles: ['owner'],
        },
      },
    }
  );
}

async function checkIfUserIsFromRootApp(db, userId) {
  const user = await db.collection(COLL_USERS).findOne({ _id: userId });

  if (!user) {
    throw new Error('user_not_found');
  }

  if (user.appId !== ADMIN_APP) {
    throw new Error('invalid_apikey');
  }
}

async function createApp(
  db,
  name,
  userId,
  { protocol: inputProtocol, themeColorPrimary, iconId }
) {
  const apiKey = Random.id(42); // AWS makes it 40, let's make it 42 to have a tiny difference. And because 42!
  const key = apiKey;
  const appId = uuid.v4();

  const appFirstChars = name
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '')
    .substr(0, 100);
  const protocol = (
    (inputProtocol && inputProtocol.substr(0, 120)) ||
    `crowdaa${appFirstChars}${Random.id(8)}proto`
  ).toLowerCase();

  const toInsert = {
    _id: appId,
    key,
    name,
    createdAt: new Date(),
    createdBy: userId,
    protocol,
    settings: DEFAULT_APP_SETTINGS,
    builds: {
      android: getAppDefaultBuildFields(name, 'android'),
      ios: getAppDefaultBuildFields(name, 'ios'),
    },
    featurePlan: {
      _id: DEFAULT_NEW_APP_PLAN_ID,
      startedAt: new Date(),
    },
  };

  if (themeColorPrimary) {
    objSet(
      toInsert,
      ['settings', 'press', 'env', 'appThemeColorPrimary'],
      themeColorPrimary
    );
  }

  if (iconId) {
    const picture = await db.collection(COLL_PICTURES).findOne({ _id: iconId });
    if (picture) {
      const haveUrl =
        picture.thumbUrl ||
        picture.mediumUrl ||
        picture.largeUrl ||
        picture.pictureUrl;
      if (haveUrl) {
        toInsert.icon = {};
        toInsert.icon._id = iconId;
        toInsert.icon.thumbUrl = picture.thumbUrl;
        toInsert.icon.mediumUrl = picture.mediumUrl;
        toInsert.icon.largeUrl = picture.largeUrl;
        toInsert.icon.pictureUrl = picture.pictureUrl;
      }

      await db
        .collection(COLL_PICTURES)
        .updateOne({ _id: iconId }, { $set: { appId } });
    }
  }

  await db.collection(COLL_APPS).insertOne(toInsert);

  return toInsert;
}

export default async (
  name,
  userId,
  { protocol = '', themeColorPrimary = '', iconId = '' } = {} // '' is required instead of null, for typescript/eslint to stop complaining...
) => {
  const client = await MongoClient.connect();
  try {
    const db = client.db();

    await checkIfUserIsFromRootApp(db, userId);

    const app = await createApp(db, name, userId, {
      protocol,
      themeColorPrimary,
      iconId,
    });
    const { _id: appId, key: apiKey } = app;

    await addUserAsAppOwner(db, userId, appId);

    await syncCreateAppBaserow(userId, { appId, name, apiKey });

    return app;
  } finally {
    client.close();
  }
};

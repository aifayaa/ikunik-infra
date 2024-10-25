/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import BadgeChecker from '../../libs/badges/BadgeChecker';
import mongoCollections from '../../libs/mongoCollections.json';
import { appsFeaturePermsList } from '../../libs/perms/permEntities.ts';

const { COLL_APPS, COLL_USERS } = mongoCollections;

async function getTabsPerms(app, user) {
  const ret = {};
  const badgeChecker = new BadgeChecker(app._id);

  const userBadges = (user && user.badges) || [];
  const userId = user && user._id;
  const appId = app._id;
  const { tabs } = app.settings.press;

  await badgeChecker.init;

  badgeChecker.registerBadges((userBadges || []).map(({ id }) => id));
  Object.keys(tabs).forEach((tab) => {
    badgeChecker.registerBadges(tabs[tab].list);
  });
  await badgeChecker.loadBadges();

  const promises = Object.keys(tabs).map(async (tab) => {
    const results = await badgeChecker.checkBadges(
      userBadges || [],
      tabs[tab],
      { userId, appId }
    );

    if (
      results.canList &&
      results.canRead &&
      results.canPreview &&
      results.canNotify
    ) {
      ret[tab] = true;
    } else {
      ret[tab] = false;
    }
  });

  await Promise.all(promises);

  await badgeChecker.close();

  return ret;
}

async function getFeaturesPerms(app, user) {
  const badgeChecker = new BadgeChecker(app._id);
  const ret = {};

  const { featuresPerms = {} } = app.settings || {};

  const finalFeaturesPerm = appsFeaturePermsList.reduce((acc, key) => {
    if (featuresPerms[key]) {
      acc[key] = featuresPerms[key];
    } else {
      acc[key] = null;
    }
    return acc;
  }, {});

  const userBadges = [...((user && user.badges) || [])];
  const userId = user && user._id;
  const appId = app && app._id;

  await badgeChecker.init;

  badgeChecker.registerBadges(userBadges.map(({ id }) => id));

  Object.keys(finalFeaturesPerm).forEach((permKey) => {
    if (finalFeaturesPerm[permKey]) {
      badgeChecker.registerBadges(
        finalFeaturesPerm[permKey].list.map(({ id }) => id)
      );
    }
  });

  await badgeChecker.loadBadges();

  const promises = Object.keys(finalFeaturesPerm).map(async (permKey) => {
    if (finalFeaturesPerm[permKey]) {
      const checkerResults = await badgeChecker.checkBadges(
        userBadges,
        finalFeaturesPerm[permKey],
        { userId, appId }
      );

      if (!checkerResults.canRead) {
        ret[permKey] = false;
      } else {
        ret[permKey] = true;
      }
    }
  });

  await Promise.allSettled(promises);

  await badgeChecker.close();

  return ret;
}

export default async (appId, userId) => {
  let client;
  const ret = {
    tabs: true,
    features: {},
  };

  try {
    client = await MongoClient.connect();

    const [app, user] = await Promise.all([
      client.db().collection(COLL_APPS).findOne({ _id: appId }),
      client.db().collection(COLL_USERS).findOne({ _id: userId, appId }),
    ]);

    if (!app) {
      throw new Error('app_not_found');
    }

    if (app.settings && app.settings.press && app.settings.press.tabs) {
      ret.tabs = await getTabsPerms(app, user);
    }

    ret.features = await getFeaturesPerms(app, user);

    return ret;
  } finally {
    client.close();
  }
};

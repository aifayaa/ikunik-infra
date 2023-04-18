import MongoClient from '../../libs/mongoClient';
import BadgeChecker from '../../libs/badges/BadgeChecker';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_APPS,
  COLL_USERS,
} = mongoCollections;

export default async (appId, userId) => {
  let client;
  const ret = {
    tabs: true,
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
    const userBadges = (user && user.badges) || [];

    if (
      app.settings &&
      app.settings.press &&
      app.settings.press.tabs
    ) {
      const { tabs } = app.settings.press;
      ret.tabs = {};

      const badgeChecker = new BadgeChecker(appId);

      await badgeChecker.init;

      badgeChecker.registerBadges((userBadges || []).map(({ id }) => (id)));
      Object.keys(tabs).forEach((tab) => {
        badgeChecker.registerBadges(tabs[tab].list);
      });
      await badgeChecker.loadBadges();

      const promises = Object.keys(tabs).map(async (tab) => {
        const results = await badgeChecker.checkBadges(
          userBadges || [],
          tabs[tab],
          { userId },
        );

        if (results.canList && results.canRead && results.canPreview && results.canNotify) {
          ret.tabs[tab] = true;
        } else {
          ret.tabs[tab] = false;
        }
      });

      await Promise.all(promises);

      await badgeChecker.close();
    }

    return (ret);
  } finally {
    client.close();
  }
};

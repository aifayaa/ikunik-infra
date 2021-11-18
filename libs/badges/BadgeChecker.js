import request from 'request-promise-native';
import MongoClient from '../mongoClient';

const {
  COLL_USER_BADGES,
} = process.env;

export default function BadgeChecker(appId) {
  if (!(this instanceof BadgeChecker)) {
    return (new BadgeChecker(appId));
  }

  this.init = (async () => {
    this.client = await MongoClient.connect();
    this.init = false;
    this.registeredBadgeIds = {};
    this.badgesMap = {};
    this.appId = appId;
  })();
}

function checkInitialized(checker) {
  if (checker.init) throw new Error('BadgeChecker not initialized');
}

BadgeChecker.prototype.close = async function close() {
  if (this.init) {
    await this.init;
  }

  this.client.close();
};

BadgeChecker.prototype.registerBadges = function registerBadges(badgeIds) {
  checkInitialized(this);

  badgeIds.forEach((id) => {
    this.registeredBadgeIds[id] = true;
  });
};

BadgeChecker.prototype.loadBadges = async function loadBadges(moreBadgeIds = null) {
  checkInitialized(this);

  if (moreBadgeIds) {
    this.registerBadges(moreBadgeIds);
  }

  const uniqIds = Object.keys(this.registeredBadgeIds);

  const badgesIds = uniqIds.filter((id) => {
    if (this.badgesMap[id]) {
      return (false);
    }

    return (true);
  });

  if (badgesIds.length > 0) {
    const badges = await this.client
      .db()
      .collection(COLL_USER_BADGES)
      .find({ _id: { $in: badgesIds }, appId: this.appId })
      .toArray();

    badges.forEach((badge) => {
      this.badgesMap[badge._id] = badge;
    });
  }
};

BadgeChecker.prototype.checkBadges = async function checkBadges(
  userBadges,
  toCheckbadges,
  options,
) {
  checkInitialized(this);

  if (!toCheckbadges) {
    return (true);
  }
  if (toCheckbadges.list.length === 0) {
    return (true);
  }

  const userBadgesMap = userBadges.reduce((acc, perm) => {
    acc[perm.id] = true;
    return (acc);
  }, {});
  let valid = false;

  await this.loadBadges([].concat(
    Object.keys(userBadgesMap),
    toCheckbadges.list.map(({ id }) => (id)),
  ));

  const promises = toCheckbadges.list.map(async (perm) => {
    const badge = this.badgesMap[perm.id] || {};

    if (badge.validationUrl) {
      const replacements = {
        APP_ID: options.appId,
        ARTICLE_ID: options.articleId,
        CATEGORY_ID: options.categoryId,
        USER_ID: options.userId,
      };
      const uri = badge.validationUrl.replace(
        /\{([A-Z_]+)\}/ig,
        (_val, name) => (replacements[name] || 'null'),
      );

      const params = {
        method: 'GET',
        uri,
      };

      try {
        await request(params);
        valid = true;
      } catch (e) {
        /* Do nothing */
      }
    }

    if (userBadgesMap[badge._id]) {
      valid = true;
    }
  });

  await Promise.all(promises);

  return (valid);
};

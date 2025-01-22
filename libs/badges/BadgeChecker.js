/* eslint-disable import/no-relative-packages */
import MongoClient from '../mongoClient';
import mongoCollections from '../mongoCollections.json';

const { COLL_EXTERNAL_PURCHASES, COLL_USER_BADGES } = mongoCollections;

/**
 * A function that runs `exec` until it returns exactly `val`.
 * There is no delay between calls, you can handle that yourself.
 */
export function promiseExecUntilEqualsTo(val, exec) {
  return new Promise((resolve, reject) => {
    const process = (ret) => {
      if (ret === val) {
        resolve();
      } else {
        exec().then(process).catch(reject);
      }
    };

    process();
  });
}

function BadgeCheckerResults({
  canList = true,
  canPreview = true,
  canRead = true,
  canNotify = true,
  restrictedBy = [],
  paidBadges = [],
} = {}) {
  const propConf = {
    configurable: false,
    enumerable: true,
    writable: false,
  };

  // These are required for typescript to know they exist...
  this.canList = undefined;
  this.canRead = undefined;
  this.canPreview = undefined;
  this.canNotify = undefined;
  this.restrictedBy = undefined;
  this.paidBadges = undefined;

  Object.defineProperty(this, 'canList', { ...propConf, value: canList });
  Object.defineProperty(this, 'canRead', { ...propConf, value: canRead });
  Object.defineProperty(this, 'canPreview', { ...propConf, value: canPreview });
  Object.defineProperty(this, 'canNotify', { ...propConf, value: canNotify });
  Object.defineProperty(this, 'restrictedBy', {
    ...propConf,
    value: restrictedBy,
  });
  Object.defineProperty(this, 'paidBadges', { ...propConf, value: paidBadges });
}

BadgeCheckerResults.prototype.merge = function merge(otherResults) {
  const canList = this.canList && otherResults.canList;
  const canPreview = this.canPreview && otherResults.canPreview;
  const canRead = this.canRead && otherResults.canRead;
  const canNotify = this.canNotify && otherResults.canNotify;

  let badgeIds = {};
  const restrictedBy = this.restrictedBy
    .concat(otherResults.restrictedBy)
    .filter((badge) => {
      if (badgeIds[badge._id]) return false;
      badgeIds[badge._id] = true;
      return true;
    });

  badgeIds = {};
  const paidBadges = this.paidBadges
    .concat(otherResults.paidBadges)
    .filter((badge) => {
      if (badgeIds[badge._id]) return false;
      badgeIds[badge._id] = true;
      return true;
    });

  return new BadgeCheckerResults({
    canList,
    canPreview,
    canRead,
    canNotify,
    restrictedBy,
    paidBadges,
  });
};

function BadgeCheckerResultsBuilder() {
  this.canList = true;
  this.canPreview = true;
  this.canRead = true;
  this.canNotify = true;

  this.restrictedBy = [];
  /* Include all badges that have a subscription price and are visible to the users.
   * It needs to be returned because ownership checks can only be done on the client side... */
  this.paidBadges = [];
}

BadgeCheckerResultsBuilder.prototype.notBlockedBy = function notBlockedBy(
  badge
) {
  const { management = 'private-internal', productId = null } = badge;

  if (
    management === 'request' ||
    management === 'public' ||
    management === 'private-visible'
  ) {
    if (productId) {
      this.paidBadges.push(badge);
    }
  }
};

BadgeCheckerResultsBuilder.prototype.blockedBy = function blockedBy(badge) {
  const { access = 'hidden', management = 'private-internal' } = badge;

  if (access === 'teaser') {
    this.canNotify = false;
    this.canPreview = false;
    this.canRead = false;
  } else if (access === 'preview') {
    this.canNotify = false;
    this.canRead = false;
  } else if (access === 'notifications') {
    this.canNotify = false;
  } else {
    this.canList = false;
    this.canNotify = false;
    this.canPreview = false;
    this.canRead = false;
  }

  if (management === 'request' || management === 'public') {
    this.restrictedBy.push(badge);
  }
};

BadgeCheckerResultsBuilder.prototype.getResults = function getResults() {
  return new BadgeCheckerResults({
    canList: this.canList,
    canPreview: this.canPreview,
    canRead: this.canRead,
    canNotify: this.canNotify,
    restrictedBy: this.restrictedBy,
    paidBadges: this.paidBadges,
  });
};

export default function BadgeChecker(appId) {
  if (!(this instanceof BadgeChecker)) {
    return new BadgeChecker(appId);
  }

  this.init = (async () => {
    this.client = await MongoClient.connect();
    this.init = false;
    this.registeredBadgeIds = {};
    this.badgesMap = {};
    this.extPurchasesMap = {};
    this.appId = appId;
  })();
}

function checkInitialized(checker) {
  if (checker.init) throw new Error('BadgeChecker not initialized');
}

BadgeChecker.newEmptyResults = function newEmptyResults() {
  return new BadgeCheckerResults();
};

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

BadgeChecker.prototype.loadBadges = async function loadBadges(
  moreBadgeIds = null
) {
  checkInitialized(this);

  if (moreBadgeIds) {
    this.registerBadges(moreBadgeIds);
  }

  const uniqIds = Object.keys(this.registeredBadgeIds);

  const badgesIds = uniqIds.filter((id) => {
    if (this.badgesMap[id]) {
      return false;
    }

    return true;
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

// Both a getter and a setter (when set is not null)
BadgeChecker.prototype.extPurchaseVal = function extPurchaseVal(
  userId,
  badgeId,
  set = null
) {
  if (set !== null) {
    this.extPurchasesMap[`${userId}|${badgeId}`] = set;
  }

  return this.extPurchasesMap[`${userId}|${badgeId}`];
};

BadgeChecker.prototype.loadExtPerms = async function loadExtPerms(userId) {
  checkInitialized(this);

  const badgesIds = Object.keys(this.badgesMap).filter((id) => {
    if (this.extPurchaseVal(userId, id)) {
      return false;
    }

    return true;
  });

  const extPurchases = await this.client
    .db()
    .collection(COLL_EXTERNAL_PURCHASES)
    .find({
      appId: this.appId,
      collection: COLL_USER_BADGES,
      userId,
      itemId: { $in: badgesIds },
    })
    .toArray();

  extPurchases.forEach(({ itemId }) => {
    this.extPurchaseVal(userId, itemId, true);
  });

  badgesIds.forEach((badgeId) => {
    if (typeof this.extPurchaseVal(userId, badgeId) !== 'boolean') {
      this.extPurchaseVal(userId, badgeId, false);
    }
  });
};

BadgeChecker.prototype.checkBadges = async function checkBadges(
  userBadges,
  toCheckbadges,
  options
) {
  const resultsBuilder = new BadgeCheckerResultsBuilder();
  checkInitialized(this);

  if (!toCheckbadges) {
    return resultsBuilder.getResults();
  }
  if (toCheckbadges.list.length === 0) {
    return resultsBuilder.getResults();
  }

  const { allow = 'any' } = toCheckbadges;

  const userBadgesMap = userBadges.reduce((acc, perm) => {
    const status = perm.status || 'assigned';
    if (status === 'validated' || status === 'assigned') {
      acc[perm.id] = true;
    }
    return acc;
  }, {});

  await this.loadBadges(
    [].concat(
      Object.keys(userBadgesMap),
      toCheckbadges.list.map(({ id }) => id)
    )
  );

  if (options.userId) {
    await this.loadExtPerms(options.userId);
  }

  let allowedAtLeastOnce = false;

  toCheckbadges.list.forEach((perm) => {
    const badge = this.badgesMap[perm.id] || {};
    let allowedForBadge = false;

    if (userBadgesMap[badge._id]) {
      allowedForBadge = true;
    } else if (
      options.userId &&
      this.extPurchaseVal(options.userId, badge._id)
    ) {
      allowedForBadge = true;
      badge.externallyOwned = true;
    }

    if (!allowedForBadge) {
      resultsBuilder.blockedBy(badge);
    } else {
      resultsBuilder.notBlockedBy(badge);
      allowedAtLeastOnce = true;
    }
  });

  if (allow === 'any' && allowedAtLeastOnce) {
    return new BadgeCheckerResults({
      paidBadges: resultsBuilder.getResults().paidBadges,
    });
  }

  return resultsBuilder.getResults();
};

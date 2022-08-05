import request from 'request-promise-native';
import MongoClient from '../mongoClient';
import { OpenSeaApi } from '../opensea';
import mongoCollections from '../mongoCollections.json';

const {
  COLL_NFT_COLLECTIONS,
  COLL_USERS,
  COLL_USER_BADGES,
} = mongoCollections;

/**
 * A function that runs `exec` until it returns exactly `val`.
 * There is no delay between calls, you can handle that yourself.
 */
export function promiseExecUntilEqualsTo(val, exec) {
  return (new Promise((resolve, reject) => {
    const process = (ret) => {
      if (ret === val) {
        resolve();
      } else {
        exec().then(process).catch(reject);
      }
    };

    process();
  }));
}

function BadgeCheckerResults({
  canList = true,
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

  Object.defineProperty(this, 'canList', { ...propConf, value: canList });
  Object.defineProperty(this, 'canRead', { ...propConf, value: canRead });
  Object.defineProperty(this, 'canNotify', { ...propConf, value: canNotify });
  Object.defineProperty(this, 'restrictedBy', { ...propConf, value: restrictedBy });
  Object.defineProperty(this, 'paidBadges', { ...propConf, value: paidBadges });
}

BadgeCheckerResults.prototype.merge = function merge(otherResults) {
  const canList = this.canList && otherResults.canList;
  const canRead = this.canRead && otherResults.canRead;
  const canNotify = this.canNotify && otherResults.canNotify;

  let badgeIds = {};
  const restrictedBy = this.restrictedBy.concat(otherResults.restrictedBy).filter((badge) => {
    if (badgeIds[badge._id]) return (false);
    badgeIds[badge._id] = true;
    return (true);
  });

  badgeIds = {};
  const paidBadges = this.paidBadges.concat(otherResults.paidBadges).filter((badge) => {
    if (badgeIds[badge._id]) return (false);
    badgeIds[badge._id] = true;
    return (true);
  });

  return new BadgeCheckerResults({
    canList,
    canRead,
    canNotify,
    restrictedBy,
    paidBadges,
  });
};

function BadgeCheckerResultsBuilder() {
  this.canList = true;
  this.canRead = true;
  this.canNotify = true;

  this.restrictedBy = [];
  /* Include all badges that have a subscription price and are visible to the users.
   * It needs to be returned because ownership checks can only be done on the client side... */
  this.paidBadges = [];
}

BadgeCheckerResultsBuilder.prototype.notBlockedBy = function notBlockedBy(badge) {
  const {
    management = 'private-internal',
    productId = null,
  } = badge;

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
  const {
    access = 'hidden',
    management = 'private-internal',
  } = badge;

  if (access === 'teaser') {
    this.canRead = false;
    this.canNotify = false;
  } else if (access === 'notifications') {
    this.canNotify = false;
  } else {
    this.canList = false;
    this.canRead = false;
    this.canNotify = false;
  }

  if (management === 'request' || management === 'public') {
    this.restrictedBy.push(badge);
  }
};

BadgeCheckerResultsBuilder.prototype.getResults = function getResults() {
  return (new BadgeCheckerResults({
    canList: this.canList,
    canRead: this.canRead,
    canNotify: this.canNotify,
    restrictedBy: this.restrictedBy,
    paidBadges: this.paidBadges,
  }));
};

export default function BadgeChecker(appId) {
  if (!(this instanceof BadgeChecker)) {
    return (new BadgeChecker(appId));
  }

  this.init = (async () => {
    this.client = await MongoClient.connect();
    this.init = false;
    this.registeredBadgeIds = {};
    this.badgesMap = {};
    this.nftCollectionsMap = {};
    this.appId = appId;
  })();
}

function checkInitialized(checker) {
  if (checker.init) throw new Error('BadgeChecker not initialized');
}

BadgeChecker.newEmptyResults = function newEmptyResults() {
  return (new BadgeCheckerResults());
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
    const nftCollectionIds = [];
    const badges = await this.client
      .db()
      .collection(COLL_USER_BADGES)
      .find({ _id: { $in: badgesIds }, appId: this.appId })
      .toArray();

    badges.forEach((badge) => {
      this.badgesMap[badge._id] = badge;
      if (badge.nftCollectionId && !this.nftCollectionsMap[badge.nftCollectionId]) {
        nftCollectionIds.push(badge.nftCollectionId);
      }
    });

    if (nftCollectionIds.length > 0) {
      const nftCollections = await this.client
        .db()
        .collection(COLL_NFT_COLLECTIONS)
        .find({ _id: { $in: nftCollectionIds }, appId: this.appId })
        .toArray();

      nftCollections.forEach((nftColl) => {
        this.nftCollectionsMap[nftColl._id] = nftColl;
      });
    }
  }
};

BadgeChecker.prototype.checkBadges = async function checkBadges(
  userBadges,
  toCheckbadges,
  options,
) {
  const resultsBuilder = new BadgeCheckerResultsBuilder();
  checkInitialized(this);

  if (!toCheckbadges) {
    return (resultsBuilder.getResults());
  }
  if (toCheckbadges.list.length === 0) {
    return (resultsBuilder.getResults());
  }

  const { allow = 'any' } = toCheckbadges;

  const userBadgesMap = userBadges.reduce((acc, perm) => {
    if (!perm.requested) {
      acc[perm.id] = true;
    }
    return (acc);
  }, {});

  await this.loadBadges([].concat(
    Object.keys(userBadgesMap),
    toCheckbadges.list.map(({ id }) => (id)),
  ));

  let allowedAtLeastOnce = false;
  let user = null;

  const promises = toCheckbadges.list.map(async (perm) => {
    const badge = this.badgesMap[perm.id] || {};
    let allowedForBadge = false;

    if (userBadgesMap[badge._id]) {
      allowedForBadge = true;
    } else if (badge.validationUrl) {
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
        allowedForBadge = true;
      } catch (e) {
        /* Do nothing */
      }
    } else if (badge.nftCollectionId) {
      try {
        const osApi = new OpenSeaApi();

        if (user === null) {
          user = await this.client
            .db()
            .collection(COLL_USERS)
            .findOne({ _id: options.userId || '', appId: this.appId });
          if (!user) user = false;
        }
        if (
          user &&
          user.crypto &&
          user.crypto.wallets &&
          user.crypto.wallets.ETH
        ) {
          const nftCollection = this.nftCollectionsMap[badge.nftCollectionId];
          let ethId = 0;
          await promiseExecUntilEqualsTo(false, async () => {
            const wallet = user.crypto.wallets.ETH[ethId];
            if (!wallet) return (false);

            const response = await osApi.call('/assets', {
              owner: wallet,
              collection_slug: nftCollection.slug,
              limit: 1,
            });

            if (response.assets && response.assets.length > 0) {
              allowedForBadge = true;
              return (false);
            }

            ethId += 1;
            await new Promise((resolve) => setTimeout(resolve, 200));
            return (true);
          });
        }
      } catch (e) {
        /* Do nothing */
      }
    }

    if (!allowedForBadge) {
      resultsBuilder.blockedBy(badge);
    } else {
      resultsBuilder.notBlockedBy(badge);
      allowedAtLeastOnce = true;
    }
  });

  await Promise.all(promises);

  if (allow === 'any' && allowedAtLeastOnce) {
    return (new BadgeCheckerResults({
      paidBadges: resultsBuilder.getResults().paidBadges,
    }));
  }

  return (resultsBuilder.getResults());
};

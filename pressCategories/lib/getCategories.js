import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import BadgeChecker from '../../libs/badges/BadgeChecker';

const { ADMIN_APP } = process.env;

const {
  COLL_PICTURES,
  COLL_PRESS_CATEGORIES,
  COLL_USERS,
} = mongoCollections;

export default async (
  appId,
  showHidden = false,
  {
    checkBadges = true,
    countOnly = false,
    fetchMaxOrder = false,
    limit,
    parentId = false,
    start,
    userId = null,
  },
) => {
  const client = await MongoClient.connect();
  const badgeChecker = new BadgeChecker(appId);

  const matchHidden = showHidden
    ? { appId }
    : {
      appId,
      hidden: { $not: { $eq: true } },
    };
  if (parentId === null) {
    matchHidden.$or = [{ parentId: { $exists: false } }, { parentId: null }];
  } else if (parentId) {
    matchHidden.parentId = parentId;
  }

  try {
    if (countOnly) {
      const categoriesCount = await client
        .db()
        .collection(COLL_PRESS_CATEGORIES)
        .find(matchHidden, { _id: 1 })
        .count();
      return { count: categoriesCount };
    }
    if (fetchMaxOrder) {
      const matchOrderedCategories = {
        appId,
        order: { $ne: 999 },
        parentId: null,
      };
      if (parentId) {
        matchOrderedCategories.parentId = parentId;
      }
      const categoriesCount = await client
        .db()
        .collection(COLL_PRESS_CATEGORIES)
        .find(matchOrderedCategories, { _id: 1 })
        .count();

      return { count: categoriesCount };
    }

    start = parseInt(start, 10) || 0;
    limit = parseInt(limit, 10) || 10;

    const pipelineSkipLimit =
      limit > 0 ? [{ $skip: start }, { $limit: limit }] : [];

    const pipeline = [
      { $match: matchHidden },
      {
        $sort: {
          order: 1,
          createdAt: -1,
          name: 1,
        },
      },
      ...pipelineSkipLimit,
      {
        $lookup: {
          from: COLL_PICTURES,
          localField: 'picture',
          foreignField: '_id',
          as: 'picture',
        },
      },
      {
        $unwind: {
          path: '$pictures',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    let categories = await client
      .db()
      .collection(COLL_PRESS_CATEGORIES)
      .aggregate(pipeline)
      .toArray();
    const count = categories.length;

    const user = userId
      ? await client
        .db()
        .collection(COLL_USERS)
        .findOne({ _id: userId })
      : null;

    if (checkBadges && (!user || user.appId !== ADMIN_APP)) {
      const userBadges = (user && user.badges) || [];

      await badgeChecker.init;

      categories.forEach((cat) => {
        if (cat.badges && cat.badges.list.length > 0) {
          badgeChecker.registerBadges(cat.badges.list.map(({ id }) => (id)));
        }
      });
      await badgeChecker.loadBadges();

      const opts = {
        appId,
        userId,
        categoryId: null,
      };
      const promises = categories.map((cat) => (
        (async () => {
          const result = await badgeChecker.checkBadges(
            userBadges,
            cat.badges,
            { ...opts, categoryId: cat._id },
          );
          if (result.canList) return (cat);
          return (null);
        })()
      ));

      categories = await Promise.all(promises);
      categories = categories.filter((x) => (x));
    }

    return { categories, count };
  } finally {
    badgeChecker.close();
    client.close();
  }
};

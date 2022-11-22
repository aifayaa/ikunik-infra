import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendNotificationTo } from './snsNotifications';
import prepareNotif from './prepareNotifString';
import BadgeChecker from '../../libs/badges/BadgeChecker';

const {
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  COLL_PRESS_NOTIFICATIONS_QUEUE,
  COLL_PUSH_NOTIFICATIONS,
  COLL_USERS,
} = mongoCollections;

const PROCESS_BATCH_SIZE = 200;

async function userHaveBadgesPermissions(badgeChecker, user, artCatBadges, options) {
  let checkerResults = BadgeChecker.newEmptyResults();
  const promises = artCatBadges.map(async (toCheckbadges) => {
    const newResult = await badgeChecker.checkBadges(
      user.badges || [],
      toCheckbadges,
      {
        userId: user._id,
        ...options,
      },
    );

    checkerResults = checkerResults.merge(newResult);
  });

  await Promise.all(promises);

  return (checkerResults.canNotify);
}

function getArticleBadges(article) {
  const badges = [];

  if (
    article.badges &&
    article.badges.list.length > 0
  ) {
    badges.push(article.badges);
  }

  if (
    article.category &&
    article.category.badges &&
    article.category.badges.list.length > 0
  ) {
    badges.push(article.category.badges);
  }

  if (article.categories) {
    article.categories.forEach((category) => {
      if (category.badges && category.badges.list.length > 0) {
        badges.push(category.badges);
      }
    });
  }

  return (badges);
}

export const sendArticleNotifications = async (
  appId,
  articleId,
  draftId,
  notifyAt,
) => {
  const client = await MongoClient.connect();
  const badgeChecker = new BadgeChecker(appId);

  try {
    const $match = { appId, articleId, draftId, notifyAt: new Date(notifyAt) };
    const pendingNotifs = await client
      .db()
      .collection(COLL_PRESS_NOTIFICATIONS_QUEUE)
      .aggregate([
        { $match },
        { $limit: PROCESS_BATCH_SIZE },
        { $lookup: {
          from: COLL_PUSH_NOTIFICATIONS,
          localField: 'endpointId',
          foreignField: '_id',
          as: 'endpoint',
        } },
        { $lookup: {
          from: COLL_USERS,
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        } },
        { $project: {
          endpoint: 1,
          user: 1,
          notificationContent: 1,
          notificationTitle: 1,
        } },
      ])
      .toArray();

    const [article] = await client.db().collection(COLL_PRESS_ARTICLES).aggregate([
      { $match: {
        _id: articleId,
        draftId,
        isPublished: true,
        trashed: { $ne: true },
      } },
      { $lookup: {
        from: COLL_PRESS_CATEGORIES,
        localField: 'categoriesId',
        foreignField: '_id',
        as: 'categories',
      } },
      { $lookup: {
        from: COLL_PRESS_CATEGORIES,
        localField: 'categoryId',
        foreignField: '_id',
        as: 'category',
      } },
      { $unwind: '$category' },
    ]).toArray();

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const retry = !!((pendingNotifs.length === PROCESS_BATCH_SIZE) && article);
    if (article) {
      const checkerOptions = {
        articleId: article._id,
        categoryId: article.categoryId,
        categoriesId: (article.categoriesId || []).join(','),
        appId: article.appId,
      };
      const artCatBadges = getArticleBadges(article);
      let title = prepareNotif(article.title, 60, false);
      let message = prepareNotif(article.plainText);

      await badgeChecker.init;
      if (artCatBadges.length > 0) {
        const badgeIds = [];
        artCatBadges.forEach(({ list }) => { list.forEach(({ id }) => { badgeIds.push(id); }); });
        await badgeChecker.loadBadges(badgeIds);
      }

      const promises = pendingNotifs.map(async ({
        endpoint: [endpoint],
        user: [user],
        notificationContent = null,
        notificationTitle = null,
      }) => {
        if (!endpoint) return;

        if (artCatBadges.length > 0) {
          if (!user) {
            skipped += 1;
            return;
          }

          const canSendNotification = await userHaveBadgesPermissions(
            badgeChecker,
            user,
            artCatBadges,
            checkerOptions,
          );
          if (!canSendNotification) {
            skipped += 1;
            return;
          }
        }

        if (notificationContent || notificationTitle) {
          title = notificationTitle;
          message = notificationContent;
        }

        await new Promise((resolve) => {
          sendNotificationTo({
            title,
            message,
            endpoint,
            extraData: { articleId },
          }, (error/* , res */) => {
            if (!error) sent += 1;
            else failed += 1;
            resolve();
          });
        });
      });
      await Promise.all(promises);

      if (!retry) {
        await client.db().collection(COLL_PRESS_ARTICLES).updateOne(
          { _id: articleId },
          { $unset: { pendingNotificationAwsArnId: '' } },
        );
      }
    }

    if (!article) {
      await client
        .db()
        .collection(COLL_PRESS_NOTIFICATIONS_QUEUE)
        .deleteMany($match);
    } else if (pendingNotifs.length > 0) {
      await client
        .db()
        .collection(COLL_PRESS_NOTIFICATIONS_QUEUE)
        .deleteMany({
          _id: { $in: pendingNotifs.map(({ _id }) => (_id)) },
        });
    }

    /**
     * @TODO Also check if there are very old / stale pending notifications
     *       to remove, even from other apps, maybe?
     */

    return ({
      requested: PROCESS_BATCH_SIZE,
      received: pendingNotifs.length,
      sent,
      failed,
      skipped,
      retry,
    });
  } finally {
    await badgeChecker.close();
    await client.close();
  }
};

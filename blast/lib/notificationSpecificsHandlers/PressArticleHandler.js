/* eslint-disable import/no-relative-packages */
import mongoCollections from '../../../libs/mongoCollections.json';
import BadgeChecker from '../../../libs/badges/BadgeChecker';

const { COLL_PRESS_ARTICLES, COLL_PRESS_CATEGORIES } = mongoCollections;

async function userHaveBadgesPermissions(
  badgeChecker,
  user,
  artCatBadges,
  options
) {
  let checkerResults = BadgeChecker.newEmptyResults();
  const promises = artCatBadges.map(async (toCheckbadges) => {
    const newResult = await badgeChecker.checkBadges(
      user.badges || [],
      toCheckbadges,
      {
        userId: user._id,
        ...options,
      }
    );

    checkerResults = checkerResults.merge(newResult);
  });

  await Promise.all(promises);

  return checkerResults.canNotify;
}

function getArticleBadges(article) {
  const badges = [];

  if (article.badges && article.badges.list.length > 0) {
    badges.push(article.badges);
  }

  if (article.categories) {
    article.categories.forEach((category) => {
      if (category.badges && category.badges.list.length > 0) {
        badges.push(category.badges);
      }
    });
  } else if (
    article.category &&
    article.category.badges &&
    article.category.badges.list.length > 0
  ) {
    badges.push(article.category.badges);
  }

  return badges;
}

function PressArticleHandler() {
  this.badgeChecker = new BadgeChecker(this.appId);
}

PressArticleHandler.prototype.init = async function init() {
  const [article] = await this.client
    .db()
    .collection(COLL_PRESS_ARTICLES)
    .aggregate([
      {
        $match: {
          _id: this.queueData.articleId,
          draftId: this.queueData.draftId,
          isPublished: true,
          trashed: { $ne: true },
        },
      },
      {
        $lookup: {
          from: COLL_PRESS_CATEGORIES,
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $lookup: {
          from: COLL_PRESS_CATEGORIES,
          localField: 'categoriesId',
          foreignField: '_id',
          as: 'categories',
        },
      },
    ])
    .toArray();

  if (!article) return false;

  this.checkerOptions = {
    articleId: article._id,
    categoryId: article.categoryId,
    appId: article.appId,
  };
  this.artCatBadges = getArticleBadges(article);
  this.title = this.queueData.title;
  this.content = this.queueData.content;

  await this.badgeChecker.init;
  if (this.artCatBadges.length > 0) {
    const badgeIds = [];
    this.artCatBadges.forEach(({ list }) => {
      list.forEach(({ id }) => {
        badgeIds.push(id);
      });
    });
    await this.badgeChecker.loadBadges(badgeIds);
  }

  return true;
};

PressArticleHandler.prototype.processOne = async function processOne({ user }) {
  if (this.artCatBadges.length > 0) {
    if (!user) {
      return {
        canNotify: false,
      };
    }

    const canSendNotification = await userHaveBadgesPermissions(
      this.badgeChecker,
      user,
      this.artCatBadges,
      this.checkerOptions
    );
    if (!canSendNotification) {
      return {
        canNotify: false,
      };
    }
  }

  const { title, content } = this;

  return {
    canNotify: true,
    data: {
      isText: true,
      title,
      content,
      extraData: { articleId: this.queueData.articleId },
    },
  };
};

PressArticleHandler.prototype.batchDone = async function batchDone(
  abort,
  retry
) {
  if (!abort && !retry) {
    await this.client
      .db()
      .collection(COLL_PRESS_ARTICLES)
      .updateOne(
        { _id: this.queueData.articleId },
        { $unset: { pendingNotificationQueueId: '' } }
      );
  }

  await this.badgeChecker.close();
};

export default PressArticleHandler;

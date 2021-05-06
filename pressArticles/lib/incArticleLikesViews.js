import MongoClient from '../../libs/mongoClient';

const { DB_NAME, COLL_PRESS_ARTICLES } = process.env;

export const incArticleLikesViews = async (
  appId,
  articleId,
  {
    likes = 0,
    views = 0,
  },
) => {
  const client = await MongoClient.connect();

  try {
    const currentArticle = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .findOne({ _id: articleId, appId });

    if (!currentArticle) {
      throw new Error('content_not_found');
    }

    const currentArticleLikes = currentArticle.likes || 0;
    const currentArticleViews = currentArticle.views || 0;
    const minLikes = 1;
    const minViews = 1;
    const $inc = {};
    if (likes) {
      const newVal = currentArticleLikes + likes;
      if (newVal >= minLikes) {
        $inc.likes = likes;
      } else if (currentArticleLikes > minLikes) {
        $inc.likes = minLikes - currentArticleLikes;
      }
    }
    if (views) {
      const newVal = currentArticleViews + views;
      if (newVal >= minViews) {
        $inc.views = views;
      } else if (currentArticleViews > minViews) {
        $inc.views = minViews - currentArticleViews;
      }
    }

    if (!$inc.likes && !$inc.views) {
      return;
    }

    await client
      .db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .updateOne({ _id: articleId }, { $inc });
  } finally {
    client.close();
  }
};

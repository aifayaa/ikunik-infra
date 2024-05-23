/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_ARTICLES } = mongoCollections;

export const incArticleLikesViews = async (
  appId,
  articleId,
  { likes = 0, views = 0 }
) => {
  const client = await MongoClient.connect();

  try {
    const currentArticle = await client
      .db()
      .collection(COLL_PRESS_ARTICLES)
      .findOne({ _id: articleId, appId });

    if (!currentArticle) {
      throw new Error('content_not_found');
    }

    const currentArticleLikes = currentArticle.likes || 0;
    const currentArticleViews = currentArticle.views || 0;
    let newLikesVal = currentArticleLikes;
    let newViewsVal = currentArticleViews;
    const minLikes = 1;
    const minViews = 1;
    const $inc = {};
    if (likes) {
      newLikesVal = currentArticleLikes + likes;
      if (newLikesVal >= minLikes) {
        $inc.likes = likes;
      } else if (currentArticleLikes > minLikes) {
        $inc.likes = minLikes - currentArticleLikes;
      }
    }
    if (views) {
      newViewsVal = currentArticleViews + views;
      if (newViewsVal >= minViews) {
        $inc.views = views;
      } else if (currentArticleViews > minViews) {
        $inc.views = minViews - currentArticleViews;
      }
    }

    if (newLikesVal > newViewsVal) {
      if ($inc.likes) {
        $inc.likes += newViewsVal - newLikesVal;
      } else {
        $inc.likes = newViewsVal - newLikesVal;
      }
    }

    if (!$inc.likes && !$inc.views) {
      return;
    }

    await client
      .db()
      .collection(COLL_PRESS_ARTICLES)
      .updateOne({ _id: articleId }, { $inc });
  } finally {
    client.close();
  }
};

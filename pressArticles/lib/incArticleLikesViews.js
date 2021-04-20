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

    const $inc = {};
    if (likes) $inc.likes = likes;
    if (views) $inc.views = views;

    await client
      .db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .updateOne({ _id: articleId }, { $inc });
  } finally {
    client.close();
  }
};

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_PRESS_ARTICLES,
  COLL_PRESS_MODALS,
} = mongoCollections;

const boolEq = (a, b) => (!!a === !!b);

export const getArticleModals = async (
  articleId,
  appId,
  {
    userId = null,
  } = {},
) => {
  const client = await MongoClient.connect();
  try {
    const article = await client
      .db()
      .collection(COLL_PRESS_ARTICLES)
      .findOne({ _id: articleId, appId });

    if (!article) {
      throw new Error('article_not_found');
    }

    const dbModals = await client
      .db()
      .collection(COLL_PRESS_MODALS)
      .find({ appId })
      .toArray();

    const modals = dbModals.filter((modal) => {
      if (typeof modal.loggedIn === 'boolean') {
        return (boolEq(modal.loggedIn, userId));
      }
      if (typeof modal.articleId === 'string') {
        return (modal.articleId === articleId);
      }

      return (true);
    }).map(({ _id, html, zindex }) => ({ _id, html, zindex }));

    return modals;
  } finally {
    client.close();
  }
};

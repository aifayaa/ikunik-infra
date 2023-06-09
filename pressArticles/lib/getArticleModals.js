import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_PRESS_ARTICLES,
  COLL_PRESS_MODALS,
} = mongoCollections;

const boolEq = (a, b) => (!!a === !!b);

/**
 * Modals are managed by hand for now. Example structure :
{
  _id: 'abc-def-ghi',
  appId : '123-456-789',
  loggedIn : false, // Optionnal, evaluated as a boolean anyway
  zindex : 10,
  maxDisplayCount: 42, // Optionnal
  articleId: '1234-5678', // Optionnal
  html: '<p>some html code here</p>',
}
 */
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
    }).map(({
      _id,
      html,
      maxDisplayCount = null,
      zindex,
    }) => ({
      _id,
      html,
      maxDisplayCount,
      zindex,
    }));

    return (modals);
  } finally {
    client.close();
  }
};

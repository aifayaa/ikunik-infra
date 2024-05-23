/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_ARTICLES, COLL_PRESS_MODALS } = mongoCollections;

const boolEq = (a, b) => !!a === !!b;

/**
 * Modals are managed by hand for now. Example structure :
{
  _id: 'abc-def-ghi',
  appId : '123-456-789',
  loggedIn : false, // Optionnal
  zindex : 10, // Z-index to add to the default 5000 value. (so 4 will give 5004 in the app)
  maxDisplayCount: 42, // Optionnal
  type: 'article', // defaults to 'article', can be 'app' or 'article' for now
  articleId: '1234-5678', // Optionnal, needed only for type=article
  html: '<p>some html code here</p>', // Optionnal if video is set
  video: 'abcd-efgh-ijkl', // Needed it html is not set, ID of video object
}
 */
export const getArticleModals = async (
  articleId,
  appId,
  { userId = null } = {}
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

    const modals = dbModals
      .filter((modal) => {
        if (typeof modal.type === 'string' && modal.type !== 'article') {
          return false;
        }
        if (typeof modal.loggedIn === 'boolean') {
          return boolEq(modal.loggedIn, userId);
        }
        if (typeof modal.articleId === 'string') {
          return modal.articleId === articleId;
        }

        return true;
      })
      .map(({ _id, html, maxDisplayCount = null, video, zindex }) => ({
        _id,
        html,
        video,
        maxDisplayCount,
        zindex,
      }));

    return modals;
  } finally {
    client.close();
  }
};

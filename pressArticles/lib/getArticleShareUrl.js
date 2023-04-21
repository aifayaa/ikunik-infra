import MongoClient from '../../libs/mongoClient';
import callTLY from '../../libs/backends/t.ly';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_APPS,
  COLL_PRESS_ARTICLES,
} = mongoCollections;

const {
  REACT_APP_SSR_URL,
} = process.env;

export const getArticleShareUrl = async (
  articleId,
  appId,
) => {
  const client = await MongoClient.connect();
  try {
    const [article, app] = await Promise.all([
      client
        .db()
        .collection(COLL_PRESS_ARTICLES)
        .findOne({ _id: articleId, appId }),
      client
        .db()
        .collection(COLL_APPS)
        .findOne({
          _id: appId,
        }, { projection: { protocol: 1, name: 1 } }),
    ]);

    /* Mostly for tests, it shoud never happen otherwise */
    if (!app) {
      throw new Error('app_not_found');
    }
    if (!article) {
      throw new Error('content_not_found');
    }

    const internalShareUrl = `https://${REACT_APP_SSR_URL}/articles/${articleId}?redirect_url=${app.protocol}://goto/articles/${articleId}&appName=${encodeURI(app.name)}`;

    if (article.shareUrl && article.shareUrl !== internalShareUrl) {
      return (article.shareUrl);
    }

    let shareUrl = internalShareUrl;
    try {
      const response = await callTLY('POST', '/link/shorten', {
        long_url: internalShareUrl,
      });

      if (response && response.short_url) {
        shareUrl = response.short_url;

        await client
          .db()
          .collection(COLL_PRESS_ARTICLES)
          .updateOne({ _id: articleId, appId }, { $set: { shareUrl } });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Error when requesting t.ly share for article ${articleId} (app ${app._id}) :`, e);
    }

    return (shareUrl);
  } finally {
    client.close();
  }
};

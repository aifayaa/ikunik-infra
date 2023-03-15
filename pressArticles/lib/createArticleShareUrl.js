import callTLY from '../../libs/backends/t.ly';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_APPS,
} = mongoCollections;

const {
  REACT_APP_SSR_URL,
} = process.env;

export default async function createArticleShareUrl(appId, articleId, previousShareUrl = null) {
  const client = await MongoClient.connect();

  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne({
        _id: appId,
      }, { projection: { protocol: 1, name: 1 } });

    /* Mostly for tests, it shoud never happen otherwise */
    if (!app) return (false);

    const internalShareUrl = `https://${REACT_APP_SSR_URL}/articles/${articleId}?redirect_url=${app.protocol}://goto/articles/${articleId}&appName=${encodeURI(app.name)}`;
    let shareUrl = internalShareUrl;

    if (previousShareUrl && previousShareUrl !== internalShareUrl) {
      return (false);
    }

    try {
      const response = await callTLY('POST', '/link/shorten', {
        long_url: internalShareUrl,
      });

      if (response && response.short_url) {
        shareUrl = response.short_url;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Error when requesting t.ly share for article ${articleId} (app ${app._id}) :`, e);
    }

    return (shareUrl);
  } finally {
    client.close();
  }
}

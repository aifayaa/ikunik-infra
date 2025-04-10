/* eslint-disable import/no-relative-packages */
import { WordpressAPI } from '../../libs/backends/wordpress';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS, COLL_PRESS_DRAFTS, COLL_PRESS_ARTICLES } = mongoCollections;

export const removeArticle = async (_userId, appId, articleId) => {
  const client = await MongoClient.connect();
  let session;

  try {
    session = client.startSession();
    session.startTransaction();
    const opts = { session };

    await client.db().collection(COLL_PRESS_ARTICLES).deleteOne(
      {
        _id: articleId,
        appId,
      },
      opts
    );

    await client.db().collection(COLL_PRESS_DRAFTS).deleteMany(
      {
        articleId,
        appId,
      },
      opts
    );

    await session.commitTransaction();

    try {
      const app = await client.db().collection(COLL_APPS).findOne({
        _id: appId,
      });

      const wpApi = new WordpressAPI(app);

      await wpApi.call('POST', '/crowdaa-sync/v1/sync/article/removed', {
        articleId,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        `Error calling delete WP API for ${_userId}/${appId}/${articleId}`,
        e
      );
    }

    return { articleId };
  } finally {
    if (session) session.endSession();
    client.close();
  }
};

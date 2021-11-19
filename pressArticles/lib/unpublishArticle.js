import MongoClient from '../../libs/mongoClient';
import { cleanPendingArticleNotifications } from './notificationsQueue';

const {
  COLL_PRESS_ARTICLES,
  DB_NAME,
  COLL_PRESS_DRAFTS,
} = process.env;

export const unpublishArticle = async (userId, appId, articleId) => {
  const client = await MongoClient.connect();
  let session;

  try {
    session = client.startSession();
    session.startTransaction();
    const opts = { session };

    await client
      .db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .updateOne(
        {
          _id: articleId,
          appId,
        },
        {
          $set: {
            isPublished: false,
          },
        },
        opts,
      );

    await client
      .db(DB_NAME)
      .collection(COLL_PRESS_DRAFTS)
      .updateMany(
        {
          articleId,
          appId,
        },
        {
          $set: {
            isPublished: false,
          },
        },
        opts,
      );

    await session.commitTransaction();

    await cleanPendingArticleNotifications(articleId);

    return { articleId };
  } finally {
    if (session) session.endSession();
    client.close();
  }
};

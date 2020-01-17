import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PRESS_DRAFTS,
  COLL_PRESS_ARTICLES,
} = process.env;

export const removeArticle = async (_userId, appId, articleId) => {
  const client = MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });
  let session;

  try {
    session = client.startSession();
    session.startTransaction();
    const opts = { session };

    await client
      .db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .deleteOne(
        {
          _id: articleId,
          appIds: { $elemMatch: { $eq: appId } },
        },
        opts,
      );

    await client
      .db(DB_NAME)
      .collection(COLL_PRESS_DRAFTS)
      .deleteMany(
        {
          articleId,
          appIds: { $elemMatch: { $eq: appId } },
        },
        opts,
      );

    await session.commitTransaction();

    return { articleId };
  } finally {
    if (session) session.endSession();
    client.close();
  }
};

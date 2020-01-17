import MongoClient from '../../libs/mongoClient'

const {
  COLL_PRESS_ARTICLES,
  DB_NAME,
  MONGO_URL,
  COLL_PRESS_DRAFTS,
} = process.env;

export const unpublishArticle = async (userId, appId, articleId) => {
  const client = MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });
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
          appIds: { $elemMatch: { $eq: appId } },
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
          appIds: { $elemMatch: { $eq: appId } },
        },
        {
          $set: {
            isPublished: false,
          },
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

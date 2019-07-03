import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PRESS_DRAFTS,
  COLL_PRESS_ARTICLES,
} = process.env;

export const publishArticle = async (userId, appId, articleId, draftId) => {
  const client = await MongoClient.connect(MONGO_URL, {
    useNewUrlParser: true,
  });
  let session;

  try {
    session = client.startSession();
    session.startTransaction();
    const opts = { session };

    const draft = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_DRAFTS)
      .findOne({
        articleId,
        _id: draftId,
        appIds: { $elemMatch: { $eq: appId } },
      }, opts);
    if (!draft) {
      throw new Error('Not found');
    }

    const {
      title,
      summary,
      text,
      md,
      _id,
      pictures,
      plainText,
    } = draft;

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
            title,
            summary,
            text,
            md,
            plainText,
            draftId: _id,
            isPublished: true,
            publishedBy: userId,
            pictures,
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

    await client
      .db(DB_NAME)
      .collection(COLL_PRESS_DRAFTS)
      .updateOne(
        {
          _id: draftId,
          appIds: { $elemMatch: { $eq: appId } },
        },
        {
          $set: {
            isPublished: true,
          },
        },
        opts,
      );

    await session.commitTransaction();

    return { articleId, draftId };
  } catch (error) {
    throw error;
  } finally {
    if (session) session.endSession();
    client.close();
  }
};

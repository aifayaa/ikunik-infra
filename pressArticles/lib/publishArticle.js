import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PRESS_DRAFTS,
  COLL_PRESS_ARTICLES,
} = process.env;

export const publishArticle = async (userId, appId, articleId, draftId, publicationDate) => {
  const client = MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });
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
      _id,
      actions,
      categoryId,
      feedPicture,
      md,
      pictures,
      plainText,
      summary,
      text,
      title,
      videos,
    } = draft;

    const $set = {
      actions,
      categoryId,
      draftId: _id,
      feedPicture: feedPicture || undefined,
      isPublished: true,
      md,
      pictures: (typeof pictures !== 'undefined' && pictures.length) ? pictures : undefined,
      plainText,
      publicationDate,
      publishedBy: userId,
      summary,
      text,
      title,
      videos: (typeof videos !== 'undefined' && videos.length) ? videos : undefined,
    };

    if (!$set.videos && !$set.pictures) {
      throw new Error('Unable to publish article without pictures or videos');
    }

    await client
      .db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .updateOne(
        {
          _id: articleId,
          appIds: { $elemMatch: { $eq: appId } },
        }, {
          $set,
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
            publicationDate,
          },
        },
        opts,
      );

    await session.commitTransaction();

    return { articleId, draftId };
  } finally {
    if (session) session.endSession();
    client.close();
  }
};

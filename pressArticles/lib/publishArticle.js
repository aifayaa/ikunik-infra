import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PRESS_DRAFTS,
  COLL_PRESS_ARTICLES,
} = process.env;

export const publishArticle = async (userId, appId, articleId, draftId, publicationDate) => {
  const client = await MongoClient.connect();
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
        appId,
      }, opts);
    if (!draft) {
      throw new Error('Not found');
    }

    const {
      _id,
      actions,
      categoryId,
      feedPicture,
      hideFromFeed,
      md,
      pictures,
      plainText,
      productId,
      storeProductId,
      summary,
      text,
      title,
      videoPlayMode,
      videos,
      pinned,
    } = draft;

    const $set = {
      actions,
      categoryId,
      draftId: _id,
      feedPicture: feedPicture || undefined,
      hideFromFeed,
      isPublished: true,
      md,
      pictures: (typeof pictures !== 'undefined' && pictures.length) ? pictures : undefined,
      plainText,
      productId,
      publicationDate,
      publishedBy: userId,
      storeProductId,
      summary,
      text,
      title,
      videoPlayMode,
      pinned,
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
          appId,
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
      .updateOne(
        {
          _id: draftId,
          appId,
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

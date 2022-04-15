import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_PRESS_DRAFTS,
  COLL_PRESS_ARTICLES,
} = mongoCollections;

export const publishArticle = async (userId, appId, articleId, draftId, publicationDate) => {
  const client = await MongoClient.connect();
  let session;

  try {
    session = client.startSession();
    session.startTransaction();
    const opts = { session };

    const draft = await client
      .db()
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
      authorName,
      badges,
      categoryId,
      displayOptions,
      feedPicture,
      hideFromFeed,
      md,
      mediaCaptions,
      pictures,
      plainText,
      productId,
      storeProductId,
      summary,
      text,
      thumbnailDisplayMethod,
      title,
      videoPlayMode,
      videos,
      pinned,
    } = draft;

    const $set = {
      actions,
      authorName,
      badges: badges || ({ list: [], allow: 'any' }),
      categoryId,
      draftId: _id,
      displayOptions: displayOptions || {},
      feedPicture: feedPicture || undefined,
      hideFromFeed,
      isPublished: true,
      md,
      mediaCaptions,
      pictures: (typeof pictures !== 'undefined' && pictures.length) ? pictures : undefined,
      plainText,
      productId,
      publicationDate,
      publishedBy: userId,
      storeProductId,
      summary,
      text,
      thumbnailDisplayMethod,
      title,
      videoPlayMode,
      pinned,
      videos: (typeof videos !== 'undefined' && videos.length) ? videos : undefined,
    };

    if (!$set.videos && !$set.pictures) {
      throw new Error('Unable to publish article without pictures or videos');
    }

    await client
      .db()
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
      .db()
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
      .db()
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

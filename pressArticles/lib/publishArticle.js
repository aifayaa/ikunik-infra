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
      categoriesId,
      categoryId,
      displayOptions,
      feedPicture,
      hideFromFeed,
      isWebview,
      md,
      mediaCaptions,
      pdfs,
      pdfsOpenButton,
      pictures,
      pinned,
      plainText,
      productId,
      storeProductId,
      summary,
      text,
      thumbnailDisplayMethod,
      title,
      videoPlayMode,
      videos,
    } = draft;

    const $set = {
      actions,
      authorName,
      badges: badges || ({ list: [], allow: 'any' }),
      categoriesId,
      categoryId,
      displayOptions: displayOptions || {},
      draftId: _id,
      feedPicture: feedPicture || undefined,
      hideFromFeed,
      isPublished: true,
      isWebview,
      md,
      mediaCaptions,
      pdfs: (typeof pdfs !== 'undefined' && pdfs.length) ? pdfs : undefined,
      pdfsOpenButton,
      pictures: (typeof pictures !== 'undefined' && pictures.length) ? pictures : undefined,
      pinned,
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

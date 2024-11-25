/* eslint-disable import/no-relative-packages */
import uuidv4 from 'uuid/v4';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { manageArticleProduct } from './manageArticleProduct';

const { COLL_PRESS_DRAFTS, COLL_PRESS_ARTICLES } = mongoCollections;

export const putArticle = async ({
  actions,
  appId,
  articleId,
  authorName,
  badges = [],
  badgesAllow = 'any',
  categoriesId,
  categoryId,
  displayOptions,
  eventEndDate,
  eventStartDate,
  feedPicture,
  hideFromFeed,
  html,
  isEvent,
  isPoll,
  isWebview,
  md,
  mediaCaptions,
  pdfs,
  pdfsOpenButton,
  pictures,
  pinned = false,
  plainText = '',
  price,
  productId: storeProductId,
  summary,
  thumbnailDisplayMethod = null,
  title,
  userId,
  videoPlayMode = 'autoplay+fullscreen',
  videos,
}) => {
  if (
    typeof title !== 'string' ||
    typeof articleId !== 'string' ||
    (typeof categoryId !== 'string' && !Array.isArray(categoriesId)) ||
    (Array.isArray(categoriesId) && categoriesId.length === 0) ||
    typeof summary !== 'string' ||
    typeof html !== 'string' ||
    typeof md !== 'string' ||
    typeof pinned !== 'boolean' ||
    typeof isPoll !== 'boolean' ||
    typeof isWebview !== 'boolean' ||
    typeof isEvent !== 'boolean' ||
    !Array.isArray(badges) ||
    (!Array.isArray(pictures) && !Array.isArray(videos)) ||
    (feedPicture && typeof feedPicture !== 'string')
  ) {
    throw new Error('bad arguments');
  }

  const draftId = uuidv4();
  const client = await MongoClient.connect();
  try {
    const currentArticle = await client
      .db()
      .collection(COLL_PRESS_DRAFTS)
      .findOne({ articleId }, { sort: { createdAt: -1 } });

    const productId = await manageArticleProduct(
      appId,
      userId,
      currentArticle,
      price,
      storeProductId
    );

    if (
      categoryId &&
      Array.isArray(categoriesId) &&
      !categoriesId.indexOf(categoryId)
    ) {
      categoriesId.unshift(categoryId);
    }
    if (!categoryId) [categoryId] = categoriesId;
    if (!categoriesId) categoriesId = [categoryId];

    const draft = {
      _id: draftId,
      actions,
      ancestor: currentArticle._id,
      appId,
      articleId,
      authorName: authorName || currentArticle.authorName,
      badges: {
        list: badges.map((id) => ({ id })),
        allow: badgesAllow,
      },
      categoriesId,
      categoryId,
      createdAt: new Date(),
      eventEndDate,
      eventStartDate,
      hideFromFeed,
      isEvent,
      isPoll,
      isPublished: false,
      isWebview,
      md,
      mediaCaptions,
      pdfs,
      pdfsOpenButton,
      pinned,
      plainText,
      productId,
      storeProductId,
      summary,
      text: html,
      thumbnailDisplayMethod,
      title,
      userId,
      videoPlayMode,
    };
    if (videos) {
      draft.videos = videos;
    }
    if (pictures) {
      draft.pictures = pictures;
    }
    if (feedPicture) {
      draft.feedPicture = feedPicture;
    }
    const currentDisplayOptions = currentArticle.displayOptions || {};
    draft.displayOptions = {};
    Object.keys(currentDisplayOptions).forEach((opt) => {
      draft.displayOptions[opt] = currentDisplayOptions[opt];
    });
    Object.keys(displayOptions).forEach((opt) => {
      draft.displayOptions[opt] = displayOptions[opt];
    });

    await client.db().collection(COLL_PRESS_DRAFTS).insertOne(draft);

    // Update the 'draftId' field in the parent article
    await client
      .db()
      .collection(COLL_PRESS_ARTICLES)
      .updateOne(
        {
          _id: articleId,
        },
        {
          $set: {
            draftId,
            updatedAt: new Date(),
            updatedBy: userId,
          },
        }
      );

    return { articleId, draftId };
  } finally {
    client.close();
  }
};

import uuidv4 from 'uuid/v4';
import createArticleShareUrl from './createArticleShareUrl';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { manageArticleProduct } from './manageArticleProduct';

const { COLL_PRESS_DRAFTS } = mongoCollections;

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
  feedPicture,
  hideFromFeed,
  html,
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
    typeof isWebview !== 'boolean' ||
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
      storeProductId,
    );

    if (categoryId && Array.isArray(categoriesId) && !categoriesId.indexOf(categoryId)) {
      categoriesId.unshift(categoryId);
    }
    if (!categoryId) [categoryId] = categoriesId;
    if (!categoriesId) categoriesId = [categoryId];

    const shareUrl = await createArticleShareUrl(appId, articleId);
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
      hideFromFeed,
      isPublished: false,
      isWebview,
      md,
      mediaCaptions,
      pinned,
      pdfs,
      pdfsOpenButton,
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
    if (shareUrl) {
      draft.shareUrl = shareUrl;
    }
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

    return { articleId, draftId };
  } finally {
    client.close();
  }
};

import uuidv4 from 'uuid/v4';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { manageArticleProduct } from './manageArticleProduct';

const { COLL_PRESS_DRAFTS } = mongoCollections;

export const putArticle = async ({
  actions,
  authorName,
  appId,
  articleId,
  badges = [],
  badgesAllow = 'any',
  categoryId,
  feedPicture,
  hideFromFeed,
  html,
  md,
  mediaCaptions,
  pictures,
  plainText = '',
  price,
  productId: storeProductId,
  summary,
  thumbnailDisplayMethod = null,
  title,
  userId,
  videoPlayMode = 'autoplay+fullscreen',
  videos,
  pinned = false,
}) => {
  if (
    typeof title !== 'string' ||
    typeof articleId !== 'string' ||
    typeof categoryId !== 'string' ||
    typeof summary !== 'string' ||
    typeof html !== 'string' ||
    typeof md !== 'string' ||
    typeof pinned !== 'boolean' ||
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

    const draft = {
      _id: draftId,
      actions,
      authorName: authorName || currentArticle.authorName,
      ancestor: currentArticle._id,
      appId,
      articleId,
      badges: {
        list: badges.map((id) => ({ id })),
        allow: badgesAllow,
      },
      categoryId,
      createdAt: new Date(),
      isPublished: false,
      hideFromFeed,
      md,
      mediaCaptions,
      plainText,
      storeProductId,
      productId,
      summary,
      text: html,
      thumbnailDisplayMethod,
      title,
      userId,
      videoPlayMode,
      pinned,
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

    await client.db().collection(COLL_PRESS_DRAFTS).insertOne(draft);

    return { articleId, draftId };
  } finally {
    client.close();
  }
};

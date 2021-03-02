import uuidv4 from 'uuid/v4';
import MongoClient from '../../libs/mongoClient';
import { manageArticleProduct } from './manageArticleProduct';

const { DB_NAME, COLL_PRESS_DRAFTS } = process.env;

export const putArticle = async ({
  actions,
  appId,
  articleId,
  categoryId,
  feedPicture,
  hideFromFeed,
  html,
  md,
  pictures,
  plainText = '',
  price,
  productId: storeProductId,
  summary,
  title,
  userId,
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
    (!Array.isArray(pictures) && !Array.isArray(videos)) ||
    (feedPicture && typeof feedPicture !== 'string')
  ) {
    throw new Error('bad arguments');
  }

  const draftId = uuidv4();
  const client = await MongoClient.connect();
  try {
    const currentArticle = await client
      .db(DB_NAME)
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
      ancestor: currentArticle._id,
      appId,
      articleId,
      categoryId,
      createdAt: new Date(),
      isPublished: false,
      hideFromFeed,
      md,
      plainText,
      storeProductId,
      productId,
      summary,
      text: html,
      title,
      userId,
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

    await client.db(DB_NAME).collection(COLL_PRESS_DRAFTS).insertOne(draft);

    return { articleId, draftId };
  } finally {
    client.close();
  }
};

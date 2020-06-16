import uuidv4 from 'uuid/v4';
import MongoClient from '../../libs/mongoClient';
import { manageArticleProduct } from './manageArticleProduct';

const {
  DB_NAME,
  COLL_PRESS_DRAFTS,
} = process.env;

export const putArticle = async ({
  actions,
  appId,
  articleId,
  categoryId,
  feedPicture,
  html,
  md,
  pictures,
  plainText = '',
  price,
  summary,
  title,
  userId,
  videos,
}) => {
  if (
    typeof title !== 'string' ||
    typeof articleId !== 'string' ||
    typeof categoryId !== 'string' ||
    typeof summary !== 'string' ||
    typeof html !== 'string' ||
    typeof md !== 'string' ||
    (!Array.isArray(pictures) && !Array.isArray(videos)) ||
    (feedPicture && typeof feedPicture !== 'string')
  ) {
    throw new Error('bad arguments');
  }

  const draftId = uuidv4();
  const client = await MongoClient.connect();
  try {
    const currentArticle = await client.db(DB_NAME)
      .collection(COLL_PRESS_DRAFTS)
      .findOne(
        { articleId },
        { sort: { createdAt: -1 } },
      );

    const productId = await manageArticleProduct(appId, userId, currentArticle, price);

    const draft = {
      _id: draftId,
      actions,
      ancestor: currentArticle._id,
      appIds: [appId],
      articleId,
      categoryId,
      createdAt: new Date(),
      isPublished: false,
      md,
      plainText,
      productId,
      summary,
      text: html,
      title,
      userId,
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

    await client.db(DB_NAME)
      .collection(COLL_PRESS_DRAFTS)
      .insertOne(draft);

    return { articleId, draftId };
  } finally {
    client.close();
  }
};

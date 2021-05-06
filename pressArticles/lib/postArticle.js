import Lambda from 'aws-sdk/clients/lambda';
import uuidv4 from 'uuid/v4';
import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PRESS_DRAFTS,
  COLL_PRESS_ARTICLES,
} = process.env;

const lambda = new Lambda({
  region: process.env.REGION,
});

export const postArticle = async ({
  actions,
  appId,
  categoryId,
  feedPicture,
  hideFromFeed,
  html,
  likes = 0,
  md,
  pictures,
  plainText = '',
  price,
  productId: storeProductId,
  summary,
  title,
  userId,
  videos,
  views = 0,
  xml,
  pinned = false,
}) => {
  if (
    typeof title !== 'string' ||
    typeof categoryId !== 'string' ||
    typeof likes !== 'number' ||
    typeof summary !== 'string' ||
    typeof views !== 'number' ||
    typeof html !== 'string' ||
    typeof pinned !== 'boolean' ||
    !(['string', 'undefined'].indexOf(typeof md) + 1) ||
    !(['string', 'undefined'].indexOf(typeof xml) + 1) ||
    (!Array.isArray(pictures) && !Array.isArray(videos)) ||
    (feedPicture && typeof feedPicture !== 'string')
  ) {
    throw new Error('bad arguments');
  }

  const articleId = uuidv4();
  const draftId = uuidv4();
  const productId = uuidv4();
  let session;
  const client = await MongoClient.connect();
  try {
    const article = {
      _id: articleId,
      actions,
      appId,
      categoryId,
      createdAt: new Date(),
      draftId,
      isPublished: false,
      likes,
      hideFromFeed,
      plainText,
      summary,
      text: html,
      title,
      userId,
      views,
      pinned,
    };

    if (storeProductId) {
      article.productId = productId;
      article.storeProductId = storeProductId;
    }
    if (videos) {
      article.videos = videos;
    }
    if (pictures) {
      article.pictures = pictures;
    }
    if (feedPicture) {
      article.feedPicture = feedPicture;
    }
    if (xml) {
      article.xml = xml;
    } else {
      article.md = md;
    }
    session = client.startSession();
    session.startTransaction();
    const opts = { session, returnOriginal: false };
    await client.db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .insertOne(article, opts);

    delete article.draftId;
    article.articleId = articleId;
    article._id = draftId;
    article.ancestor = null;
    await client.db(DB_NAME)
      .collection(COLL_PRESS_DRAFTS)
      .insertOne(article, opts);

    await session.commitTransaction();
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (session) session.endSession();
    client.close();
  }

  if (storeProductId) {
    await lambda.invoke({
      FunctionName: `purchasableProducts-${process.env.STAGE}-postPurchasableProduct`,
      Payload: JSON.stringify({
        _id: productId,
        content: [{
          id: articleId,
          collection: 'pressArticle',
          permissions: { all: true },
        }],
        options: {
          appleProductId: storeProductId,
          googleProductId: storeProductId,
        },
        price,
        type: 'direct',
      }),
    }).promise();
  }

  return { articleId, draftId, productId };
};

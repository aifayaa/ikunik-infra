/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import uuidv4 from 'uuid/v4';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_DRAFTS, COLL_PRESS_ARTICLES } = mongoCollections;

const lambda = new Lambda({
  region: process.env.REGION,
});

export const postArticle = async ({
  actions,
  authorName,
  appId,
  badges = [],
  badgesAllow = 'any',
  categoriesId,
  categoryId,
  displayOptions,
  eventEndDate = new Date(),
  eventStartDate = new Date(),
  feedPicture,
  hideFromFeed,
  html,
  isEvent = false,
  isPoll = false,
  isWebview = false,
  likes = 0,
  md,
  mediaCaptions,
  pdfs = [],
  pdfsOpenButton = '',
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
  views = 0,
  xml,
  pinned = false,
}) => {
  if (
    typeof title !== 'string' ||
    (typeof categoryId !== 'string' && !Array.isArray(categoriesId)) ||
    (Array.isArray(categoriesId) && categoriesId.length === 0) ||
    typeof likes !== 'number' ||
    typeof summary !== 'string' ||
    typeof views !== 'number' ||
    typeof html !== 'string' ||
    typeof pinned !== 'boolean' ||
    typeof isPoll !== 'boolean' ||
    typeof isWebview !== 'boolean' ||
    typeof isEvent !== 'boolean' ||
    !(['string', 'undefined'].indexOf(typeof md) + 1) ||
    !(['string', 'undefined'].indexOf(typeof mediaCaptions) + 1) ||
    !(['string', 'undefined'].indexOf(typeof pdfsOpenButton) + 1) ||
    !(['string', 'undefined'].indexOf(typeof xml) + 1) ||
    !Array.isArray(badges) ||
    !Array.isArray(pdfs) ||
    (!Array.isArray(pictures) && !Array.isArray(videos)) ||
    (feedPicture && typeof feedPicture !== 'string')
  ) {
    throw new Error('bad arguments');
  }

  if (
    categoryId &&
    Array.isArray(categoriesId) &&
    !categoriesId.indexOf(categoryId)
  ) {
    categoriesId.unshift(categoryId);
  }
  if (!categoryId) [categoryId] = categoriesId;
  if (!categoriesId) categoriesId = [categoryId];
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
      authorName,
      badges: {
        list: badges.map((id) => ({ id })),
        allow: badgesAllow,
      },
      categoriesId,
      categoryId,
      createdAt: new Date(),
      displayOptions,
      draftId,
      eventEndDate,
      eventStartDate,
      hideFromFeed,
      isPublished: false,
      isEvent,
      isPoll,
      isWebview,
      likes,
      mediaCaptions,
      pinned,
      pdfs,
      pdfsOpenButton,
      plainText,
      summary,
      text: html,
      thumbnailDisplayMethod,
      title,
      userId,
      videoPlayMode,
      views,
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
    await client
      .db()
      .collection(COLL_PRESS_ARTICLES)
      .insertOne(
        {
          ...article,
          updatedAt: new Date(),
          updatedBy: userId,
        },
        opts
      );

    delete article.draftId;
    article.articleId = articleId;
    article._id = draftId;
    article.ancestor = null;
    await client.db().collection(COLL_PRESS_DRAFTS).insertOne(article, opts);

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
    await lambda
      .invoke({
        FunctionName: `purchasableProducts-${process.env.STAGE}-postPurchasableProduct`,
        Payload: JSON.stringify({
          body: JSON.stringify({
            _id: productId,
            contents: [
              {
                id: articleId,
                collection: 'pressArticle',
                permissions: { all: true },
              },
            ],
            options: {
              appleProductId: storeProductId,
              googleProductId: storeProductId,
            },
            price,
            type: 'direct',
          }),
          requestContext: {
            authorizer: {
              appId,
              perms: '{ "purchasableProducts_post": true }',
              principalId: userId,
            },
          },
        }),
      })
      .promise();
  }

  return { articleId, draftId, productId };
};

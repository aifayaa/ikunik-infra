import StepFunctions from 'aws-sdk/clients/stepfunctions';
import MongoClient from '../../libs/mongoClient';
import { cleanPendingNotification } from './cleanPendingNotification';

const {
  COLL_PRESS_ARTICLES,
  DB_NAME,
  COLL_PRESS_DRAFTS,
} = process.env;

export const unpublishArticle = async (userId, appId, articleId) => {
  const client = await MongoClient.connect();
  let session;

  try {
    session = client.startSession();
    session.startTransaction();
    const opts = { session };

    await client
      .db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .updateOne(
        {
          _id: articleId,
          appIds: appId,
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
      .updateMany(
        {
          articleId,
          appIds: appId,
        },
        {
          $set: {
            isPublished: false,
          },
        },
        opts,
      );

    await session.commitTransaction();

    cleanPendingNotification(articleId);
    const article = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .findOne({ _id: articleId });

    if (article.pendingNotificationAwsArnId) {
      if (article.publicationDate.getTime() > Date.now()) {
        const stepfunctions = new StepFunctions();
        try {
          await stepfunctions.stopExecution({
            executionArn: article.pendingNotificationAwsArnId,
          }).promise();
        } finally {
          /**
           * We don't need to investigate further, other cases are
           * handled in broadcastArticleNotification handler, so the user will never get an invalid
           * or wrong notification title/content/...
           */
        }
      }

      await client
        .db(DB_NAME)
        .collection(COLL_PRESS_ARTICLES)
        .updateOne(
          {
            _id: articleId,
          }, {
            $unset: {
              pendingNotificationAwsArnId: '',
            },
          },
        );
    }

    return { articleId };
  } finally {
    if (session) session.endSession();
    client.close();
  }
};

import StepFunctions from 'aws-sdk/clients/stepfunctions';
import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PRESS_ARTICLES,
} = process.env;

export const cleanPendingNotification = async (
  articleId,
) => {
  const client = await MongoClient.connect();
  try {
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
  } finally {
    client.close();
  }
};

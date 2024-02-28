/* eslint-disable import/no-relative-packages */
import StepFunctions from 'aws-sdk/clients/stepfunctions';
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import prepareNotif from './prepareNotifString';

const { REGION, STAGE } = process.env;

const { COLL_PRESS_ARTICLES } = mongoCollections;

const lambda = new Lambda({
  region: REGION,
});

export const queueArticleNotifications = async (
  appId,
  articleId,
  draftId,
  notifyAt,
  content = null,
  title = null
) => {
  const client = await MongoClient.connect();
  try {
    if (!(notifyAt instanceof Date)) {
      notifyAt = new Date(notifyAt);
    } else if (notifyAt < new Date()) {
      notifyAt = new Date();
    }

    if (notifyAt.toJSON() === null) {
      notifyAt = new Date();
    }

    const article = await client.db().collection(COLL_PRESS_ARTICLES).findOne({
      _id: articleId,
      appId,
    });

    if (!title && !content) {
      content = content || prepareNotif(article.plainText);
      title = title || prepareNotif(article.title, 60, false);
    }

    const response = await lambda
      .invoke({
        FunctionName: `blast-${STAGE}-queueNotifications`,
        Payload: JSON.stringify({
          appId,
          notifyAt,
          type: 'pressArticle',
          data: {
            articleId,
            draftId,
            content,
            title,
          },
        }),
      })
      .promise();
    const { queueId } = JSON.parse(response.Payload);

    if (queueId) {
      await client
        .db()
        .collection(COLL_PRESS_ARTICLES)
        .updateOne(
          {
            _id: articleId,
            appId,
          },
          {
            $set: {
              pendingNotificationQueueId: queueId,
            },
          }
        );
    }
  } finally {
    await client.close();
  }
};

export const cleanPendingArticleNotifications = async (articleId) => {
  const client = await MongoClient.connect();
  try {
    const article = await client
      .db()
      .collection(COLL_PRESS_ARTICLES)
      .findOne({ _id: articleId });

    if (article.pendingNotificationAwsArnId) {
      if (article.publicationDate.getTime() > Date.now()) {
        const stepfunctions = new StepFunctions({
          region: REGION,
        });
        try {
          await stepfunctions
            .stopExecution({
              executionArn: article.pendingNotificationAwsArnId,
            })
            .promise();
        } finally {
          /**
           * We don't need to investigate further, other cases are
           * handled in the triggered lambda, so the user will never get an invalid
           * or wrong notification title/content/...
           */
        }
      }

      await client
        .db()
        .collection(COLL_PRESS_ARTICLES)
        .updateOne(
          {
            _id: articleId,
          },
          {
            $unset: {
              pendingNotificationAwsArnId: '',
            },
          }
        );
    } else if (article.pendingNotificationQueueId) {
      await lambda
        .invoke({
          FunctionName: `blast-${STAGE}-unqueueNotifications`,
          Payload: JSON.stringify({
            appId: article.appId,
            queueId: article.pendingNotificationQueueId,
          }),
        })
        .promise();

      await client
        .db()
        .collection(COLL_PRESS_ARTICLES)
        .updateOne(
          {
            _id: articleId,
          },
          {
            $unset: {
              pendingNotificationQueueId: '',
            },
          }
        );
    }
  } finally {
    await client.close();
  }
};

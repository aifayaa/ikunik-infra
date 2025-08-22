/* eslint-disable import/no-relative-packages */
import StepFunctions from 'aws-sdk/clients/stepfunctions';
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import prepareNotif from './prepareNotifString';
import { getEnvironmentVariable } from '@libs/check';

const { COLL_PRESS_ARTICLES } = mongoCollections;

export async function queueArticleNotifications(
  appId: string,
  articleId: string,
  draftId: string,
  notifyAt: Date,
  content?: string,
  title?: string
) {
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

    if (typeof title !== 'string') {
      title = title || prepareNotif(article.title, 60, false);
    }
    if (typeof content !== 'string') {
      content = content || prepareNotif(article.plainText);
    }

    const REGION = getEnvironmentVariable('REGION');
    const STAGE = getEnvironmentVariable('STAGE');

    const lambda = new Lambda({
      region: REGION,
    });

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
    const { queueId } = response.Payload
      ? JSON.parse(response.Payload.toString())
      : { queueId: false };

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
}

export async function cleanPendingArticleNotifications(articleId: string) {
  const client = await MongoClient.connect();
  try {
    const article = await client
      .db()
      .collection(COLL_PRESS_ARTICLES)
      .findOne({ _id: articleId });

    if (article.pendingNotificationAwsArnId) {
      if (
        article.publicationDate.getTime() > Date.now() &&
        (!article.unpublicationDate ||
          article.unpublicationDate.getTime() <= Date.now())
      ) {
        const REGION = getEnvironmentVariable('REGION');

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
      const REGION = getEnvironmentVariable('REGION');
      const STAGE = getEnvironmentVariable('STAGE');

      const lambda = new Lambda({
        region: REGION,
      });
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
}

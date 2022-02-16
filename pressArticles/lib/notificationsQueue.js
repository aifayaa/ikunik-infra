import StepFunctions from 'aws-sdk/clients/stepfunctions';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  NOTIFICATION_STATE_MACHINE_NAME,
  NOTIFICATION_STATE_MACHINE_RESOURCE,
  NOTIFICATION_STATE_MACHINE_ROLE,
  REGION,
  STAGE,
} = process.env;

const {
  COLL_PRESS_ARTICLES,
  COLL_PRESS_NOTIFICATIONS_QUEUE,
  COLL_PUSH_NOTIFICATIONS,
} = mongoCollections;

const PROCESS_BATCH_SIZE = 100;

const createArticleNotificationSender = async (
  appId,
  articleId,
  draftId,
  notifyAt,
  delay,
) => {
  const stepfunctions = new StepFunctions({
    region: REGION,
  });
  const stateMachineParams = {
    name: NOTIFICATION_STATE_MACHINE_NAME,
    roleArn: NOTIFICATION_STATE_MACHINE_ROLE,
    type: 'STANDARD',
    definition: JSON.stringify({
      Comment: 'Delayed broadcasting of notification',
      StartAt: 'Delay',
      States: {
        Delay: {
          Type: 'Wait',
          SecondsPath: '$.delay',
          Next: 'callLambda',
        },
        callLambda: {
          Type: 'Task',
          Resource: 'arn:aws:states:::lambda:invoke',
          Parameters: {
            FunctionName: NOTIFICATION_STATE_MACHINE_RESOURCE,
            'Payload.$': '$',
          },
          Retry: [
            {
              ErrorEquals: [
                'Lambda.ServiceException',
                'Lambda.AWSLambdaException',
                'Lambda.SdkClientException',
              ],
              IntervalSeconds: 2,
              MaxAttempts: 6,
              BackoffRate: 2,
            },
          ],
          Next: 'Choice',
          ResultPath: '$.lastExec',
        },
        Choice: {
          Type: 'Choice',
          Choices: [
            {
              Variable: '$.lastExec.Payload.retry',
              BooleanEquals: true,
              Next: 'callLambda',
            },
          ],
          Default: 'Success',
        },
        Success: {
          Type: 'Succeed',
        },
      },
    }, null, 2), /** < Formatting because it can be read on the amazon web interface */
  };

  const { stateMachineArn } = await stepfunctions.createStateMachine(stateMachineParams).promise();

  const execParams = {
    stateMachineArn,
    name: `${STAGE}-${draftId}-${Date.now()}-${notifyAt.getTime()}`,
    input: JSON.stringify({
      appId,
      articleId,
      draftId,
      notifyAt: notifyAt.toISOString(),
      delay,
    }),
  };

  const { executionArn } = await stepfunctions.startExecution(execParams).promise();

  const client = await MongoClient.connect();
  await client
    .db()
    .collection(COLL_PRESS_ARTICLES)
    .updateOne(
      {
        _id: articleId,
        appId,
      }, {
        $set: {
          pendingNotificationAwsArnId: executionArn,
        },
      },
    );
  await client.close();
};

export const queueArticleNotifications = async (
  appId,
  articleId,
  draftId,
  notifyAt,
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

    const dbPushNotifications = client.db().collection(COLL_PUSH_NOTIFICATIONS);
    const dbPressNotifQueue = client.db().collection(COLL_PRESS_NOTIFICATIONS_QUEUE);

    const endpoints = dbPushNotifications.find(
      { appId },
      { projection: { _id: 1, Platform: 1, EndpointArn: 1, userId: 1 } },
    ).batchSize(PROCESS_BATCH_SIZE);

    const promises = [];
    let insertBatches = [];
    let queued = 0;

    await endpoints.forEach((endpoint) => {
      insertBatches.push({
        appId,
        articleId,
        draftId,
        endpointId: endpoint._id,
        userId: endpoint.userId,
        notifyAt,
      });
      queued += 1;

      if (insertBatches.length >= PROCESS_BATCH_SIZE) {
        promises.push(dbPressNotifQueue.insertMany(insertBatches));
        insertBatches = [];
      }
    });

    if (insertBatches.length > 0) {
      promises.push(dbPressNotifQueue.insertMany(insertBatches));
      insertBatches = [];
    }

    await Promise.all(promises);

    if (queued === 0) return;

    let delay = notifyAt.getTime() - Date.now();
    if (delay < 0) delay = 0;
    delay = (delay / 1000) | 0;

    await createArticleNotificationSender(appId, articleId, draftId, notifyAt, delay);
  } finally {
    await client.close();
  }
};

export const cleanPendingArticleNotifications = async (
  articleId,
) => {
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
          await stepfunctions.stopExecution({
            executionArn: article.pendingNotificationAwsArnId,
          }).promise();
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
          }, {
            $unset: {
              pendingNotificationAwsArnId: '',
            },
          },
        );
    }

    await client.db().collection(COLL_PRESS_NOTIFICATIONS_QUEUE).deleteMany({
      appId: article.appId,
      articleId,
    });
  } finally {
    await client.close();
  }
};

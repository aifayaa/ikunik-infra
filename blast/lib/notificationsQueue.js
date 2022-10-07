import StepFunctions from 'aws-sdk/clients/stepfunctions';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

/* This .json is required since this file will be included from other microservices,
 * so we will have their environment and not ours. */
import stateMachineVars from '../env.notificationStateMachine.json';

const {
  REGION,
  STAGE,
} = process.env;

const {
  NOTIFICATION_STATE_MACHINE_NAME,
  NOTIFICATION_STATE_MACHINE_RESOURCE,
  NOTIFICATION_STATE_MACHINE_ROLE,
} = stateMachineVars[STAGE][REGION];

const {
  COLL_BLAST_NOTIFICATIONS_QUEUE,
  COLL_PUSH_NOTIFICATIONS,
} = mongoCollections;

const PROCESS_BATCH_SIZE = 100;

const createNotificationSender = async (
  appId,
  queueId,
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
    name: `${STAGE}-${queueId}-${Date.now()}-${notifyAt.getTime()}`,
    input: JSON.stringify({
      appId,
      queueId,
      delay,
    }),
  };

  const { executionArn } = await stepfunctions.startExecution(execParams).promise();

  return (executionArn);
};

export const queueNotifications = async (
  appId,
  notifyAt,
  type,
  data = {},
  { only = null },
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
    const dbBlastNotifQueue = client.db().collection(COLL_BLAST_NOTIFICATIONS_QUEUE);

    const { insertedId: queueId } = await dbBlastNotifQueue.insertOne({
      appId,
      data,
      notifyAt,
      root: true,
      type,
    });

    const endpoints = dbPushNotifications.find(
      { appId },
      { projection: { _id: 1, Platform: 1, EndpointArn: 1, userId: 1 } },
    ).batchSize(PROCESS_BATCH_SIZE);

    const promises = [];
    let insertBatches = [];
    let queued = 0;

    await endpoints.forEach((endpoint) => {
      if (
        !only ||
        (only === 'users' && endpoint.userId) ||
        (only === 'devices' && !endpoint.userId)
      ) {
        insertBatches.push({
          appId,
          endpointId: endpoint._id,
          notifyAt,
          queueId,
          root: false,
          userId: endpoint.userId,
        });
        queued += 1;
      }

      if (insertBatches.length >= PROCESS_BATCH_SIZE) {
        promises.push(dbBlastNotifQueue.insertMany(insertBatches));
        insertBatches = [];
      }
    });

    if (insertBatches.length > 0) {
      promises.push(dbBlastNotifQueue.insertMany(insertBatches));
      insertBatches = [];
    }

    await Promise.all(promises);

    if (queued === 0) {
      await dbBlastNotifQueue.deleteOne({
        _id: queueId,
      });
      return (null);
    }

    let delay = notifyAt.getTime() - Date.now();
    if (delay < 0) delay = 0;
    delay = (delay / 1000) | 0;

    const executionArn = await createNotificationSender(appId, queueId, notifyAt, delay);

    await dbBlastNotifQueue.updateOne(
      { _id: queueId, appId },
      { $set: { executionArn } },
    );

    return (queueId);
  } finally {
    await client.close();
  }
};

export const unqueueNotifications = async (
  appId,
  queueId,
) => {
  const client = await MongoClient.connect();
  try {
    const dbBlastNotifQueue = client.db().collection(COLL_BLAST_NOTIFICATIONS_QUEUE);
    const queueItem = await dbBlastNotifQueue.findOne({ _id: queueId, appId });

    if (queueItem.root && queueItem.executionArn) {
      const stepfunctions = new StepFunctions({
        region: REGION,
      });
      try {
        await stepfunctions.stopExecution({
          executionArn: queueItem.executionArn,
        }).promise();
      } finally {
        /**
         * We don't need to investigate further, other cases are
         * handled in the triggered lambda, so the user will never get an invalid
         * or wrong notification title/content/...
         */
      }

      await dbBlastNotifQueue.deleteMany({
        appId,
        queueId,
        root: false,
      });
    }

    await dbBlastNotifQueue.deleteOne({
      _id: queueId, appId,
    });
  } finally {
    await client.close();
  }
};

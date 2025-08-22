import MongoClient, { ObjectID } from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import {
  CreateStateMachineCommand,
  DeleteStateMachineCommand,
  ListStateMachinesCommand,
  SFNClient,
  StartExecutionCommand,
} from '@aws-sdk/client-sfn';
import {
  AppLiveStreamStartNotificationDataType,
  AppLiveStreamType,
} from './appLiveStreamEntities';

const {
  LIVE_STREAM_WATCHER_STATE_MACHINE_NAME,
  LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE,
  LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE,
  REGION,
  STAGE,
} = process.env as {
  LIVE_STREAM_WATCHER_STATE_MACHINE_NAME: string;
  LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE: string;
  LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE: string;
  REGION: string;
  STAGE: string;
};

const { COLL_APP_LIVE_STREAMS } = mongoCollections;

const sfnClient = new SFNClient({
  region: REGION,
});

const lambda = new LambdaClient({
  apiVersion: '2016-06-27',
  region: REGION,
});

async function notifyStreamStarted(dbStream: AppLiveStreamType) {
  const buildNotifyData: AppLiveStreamStartNotificationDataType = {
    appId: dbStream.appId,
    notifyAt: new Date(),
    type: 'appLiveStreamStart',
    data: {
      liveStreamId: dbStream._id,
    },
  };

  await lambda.send(
    new InvokeCommand({
      InvocationType: 'Event',
      FunctionName: `blast-${STAGE}-queueNotifications`,
      Payload: JSON.stringify(buildNotifyData),
    })
  );
}

async function createStateMachine() {
  const stateMachineParams = new CreateStateMachineCommand({
    name: LIVE_STREAM_WATCHER_STATE_MACHINE_NAME,
    roleArn: LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE,
    type: 'STANDARD',
    definition: JSON.stringify(
      {
        Comment: 'AppLiveStreams participant counter',
        StartAt: 'callLambda',
        States: {
          sleep: {
            Type: 'Wait',
            SecondsPath: '$.lastExec.Payload.delay',
            Next: 'callLambda',
          },
          callLambda: {
            Type: 'Task',
            Resource: 'arn:aws:states:::lambda:invoke',
            Parameters: {
              FunctionName: LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE,
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
            Next: 'choice',
            ResultPath: '$.lastExec',
          },
          choice: {
            Type: 'Choice',
            Choices: [
              {
                Variable: '$.lastExec.Payload.retry',
                BooleanEquals: true,
                Next: 'sleep',
              },
            ],
            Default: 'Success',
          },
          Success: {
            Type: 'Succeed',
          },
        },
      },
      null,
      2
    ) /** < Formatting because it can be read on the AWS web interface */,
  });

  const { stateMachineArn } = await sfnClient.send(stateMachineParams);

  return stateMachineArn;
}

async function deleteStateMachine() {
  let nextToken: string | undefined = undefined;
  let toDeleteStateMachineArn: string | undefined = undefined;

  do {
    const listCommand: ListStateMachinesCommand = new ListStateMachinesCommand({
      maxResults: 500,
      nextToken,
    });
    const listResults = await sfnClient.send(listCommand);
    nextToken = listResults.nextToken;
    if (!listResults.stateMachines) break;
    for (let i = 0; i < listResults.stateMachines?.length; i += 1) {
      if (
        listResults.stateMachines[i].name ===
        LIVE_STREAM_WATCHER_STATE_MACHINE_NAME
      ) {
        toDeleteStateMachineArn = listResults.stateMachines[i].stateMachineArn;
        break;
      }
    }
  } while (nextToken && !toDeleteStateMachineArn);

  if (toDeleteStateMachineArn) {
    const deleteCommand = new DeleteStateMachineCommand({
      stateMachineArn: toDeleteStateMachineArn,
    });

    await sfnClient.send(deleteCommand);

    return true;
  }

  return false;
}

async function createStateMachineWithRetry() {
  try {
    const stateMachineArn = await createStateMachine();
    return stateMachineArn;
  } catch (e) {
    const deleted = await deleteStateMachine();

    if (deleted) {
      const stateMachineArn = await createStateMachine();
      return stateMachineArn;
    }

    throw e;
  }
}

async function startStreamWatcher(
  liveStream: AppLiveStreamType,
  streamWatcherId: string
) {
  const stateMachineArn = await createStateMachineWithRetry();

  const execParams = new StartExecutionCommand({
    stateMachineArn,
    name: `${STAGE}-${liveStream._id}-${Date.now()}`,
    input: JSON.stringify({
      appId: liveStream.appId,
      delay: 5,
      liveStreamId: liveStream._id,
      streamWatcherId,
    }),
  });

  const { executionArn } = await sfnClient.send(execParams);

  return executionArn;
}

async function getDbStreamFromStageArn(
  stageArn: string,
  { client }: { client: any }
) {
  const dbStream = (await client
    .db()
    .collection(COLL_APP_LIVE_STREAMS)
    .findOne({
      'aws.ivsStageArn': stageArn,
    })) as AppLiveStreamType | null;

  return dbStream;
}

async function setStreamStatus(
  dbStream: AppLiveStreamType,
  isStreaming: boolean,
  { client }: { client: any }
) {
  await client
    .db()
    .collection(COLL_APP_LIVE_STREAMS)
    .updateOne(
      {
        _id: dbStream._id,
      },
      {
        $set: {
          'state.viewersCount': 0,
          'state.isStreaming': isStreaming,
          'state.lastUpdate': new Date(),
        },
      }
    );
}

export async function handleStreamStarted(resources: Array<string>) {
  const client = await MongoClient.connect();

  try {
    const promises = resources.map(async (stageArn) => {
      const dbStream = await getDbStreamFromStageArn(stageArn, { client });
      if (dbStream) {
        await setStreamStatus(dbStream, true, { client });

        const streamWatcherId = new ObjectID().toString();
        const sfnStreamWatcherArn = await startStreamWatcher(
          dbStream,
          streamWatcherId
        );
        await notifyStreamStarted(dbStream);

        dbStream.streamWatcherId = streamWatcherId;
        await client
          .db()
          .collection(COLL_APP_LIVE_STREAMS)
          .updateOne(
            { _id: dbStream._id },
            {
              $set: {
                streamWatcherId: streamWatcherId,
              },
            }
          );
      }
    });

    await Promise.all(promises);
  } finally {
    await client.close();
  }
}

export async function handleStreamEnded(resources: Array<string>) {
  const client = await MongoClient.connect();

  try {
    const promises = resources.map(async (stageArn) => {
      const dbStream = await getDbStreamFromStageArn(stageArn, { client });
      if (dbStream) {
        await setStreamStatus(dbStream, false, { client });
      }
    });

    await Promise.all(promises);
  } finally {
    await client.close();
  }
}

export async function handleStreamError(resources: Array<string>) {
  const client = await MongoClient.connect();

  try {
    const promises = resources.map(async (stageArn) => {
      const dbStream = await getDbStreamFromStageArn(stageArn, { client });
      if (dbStream) {
        await setStreamStatus(dbStream, false, { client });
      }
    });

    await Promise.all(promises);
  } finally {
    await client.close();
  }
}

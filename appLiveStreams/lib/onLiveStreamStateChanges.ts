import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import {
  CreateStateMachineCommand,
  SFNClient,
  StartExecutionCommand,
} from '@aws-sdk/client-sfn';
import { AppLiveStreamType } from './appLiveStreamTypes';

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

async function startStreamWatcher(dbStream: AppLiveStreamType) {
  const stateMachineParams = new CreateStateMachineCommand({
    name: LIVE_STREAM_WATCHER_STATE_MACHINE_NAME,
    roleArn: LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE,
    type: 'STANDARD',
    definition: JSON.stringify(
      {
        Comment: 'LiveStream live participant counter',
        StartAt: 'callLambda',
        States: {
          delay: {
            Type: 'Wait',
            SecondsPath: '$.delay',
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
                Next: 'delay',
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
    ) /** < Formatting because it can be read on the amazon web interface */,
  });

  const { stateMachineArn } = await sfnClient.send(stateMachineParams);

  const execParams = new StartExecutionCommand({
    stateMachineArn,
    name: `${STAGE}-${dbStream._id}-${Date.now()}`,
    input: JSON.stringify({
      dbStreamId: dbStream._id,
      appId: dbStream.appId,
      delay: 5,
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

        await startStreamWatcher(dbStream);
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

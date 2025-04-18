import IVS, { StreamSessionSummary } from 'aws-sdk/clients/ivs';
import StepFunctions from 'aws-sdk/clients/stepfunctions';
import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import { LiveStreamType } from './liveStreamTypes';

const {
  REGION,
  STAGE,
  LIVE_STREAM_WATCHER_STATE_MACHINE_NAME,
  LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE,
  LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE,
} = process.env as {
  STAGE: CrowdaaStageType;
  REGION: CrowdaaRegionType;
  LIVE_STREAM_WATCHER_STATE_MACHINE_NAME: string;
  LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE: string;
  LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE: string;
};

const { COLL_LIVE_STREAMS, COLL_LIVE_STREAMS_DURATIONS } = mongoCollections;

const { IVS_REGION } = process.env;

const ivs = new IVS({
  apiVersion: '2020-07-14',
  region: IVS_REGION,
});

async function getDbStreamFromChannelArn(channelArn: string) {
  const client = await MongoClient.connect();

  try {
    const dbStream = (await client.db().collection(COLL_LIVE_STREAMS).findOne({
      'aws.arn': channelArn,
    })) as LiveStreamType | null;

    return dbStream;
  } finally {
    client.close();
  }
}

async function recomputeStreamDurations(channelArn: string) {
  const client = await MongoClient.connect();

  try {
    const dbStream = await getDbStreamFromChannelArn(channelArn);

    if (!dbStream) {
      // Maybe other stage, maybe old stream, who cares, discard it
      return false;
    }
    const { _id, name, appId } = dbStream;

    const streamSessions = [] as StreamSessionSummary[];
    let nextToken;
    do {
      const response = await ivs
        .listStreamSessions({
          channelArn: channelArn,
          maxResults: 100,
          nextToken,
        })
        .promise();

      streamSessions.push(...response.streamSessions);
      nextToken = response.nextToken;
    } while (nextToken);

    console.log(
      `Found ${streamSessions.length} sessions for stream ${name}/${_id} on app ${appId}`
    );
    if (streamSessions.length === 0) {
      // Shall never happen
      return false;
    }

    const promises = streamSessions.map(
      async ({ streamId, startTime, endTime }) => {
        let duration = 0;
        if (startTime && endTime) {
          duration = endTime.getTime() - startTime.getTime();
        }

        await client
          .db()
          .collection(COLL_LIVE_STREAMS_DURATIONS)
          .updateOne(
            {
              appId,
              type: dbStream.provider,
              liveStreamId: _id,
              awsStreamId: streamId,
            },
            {
              $set: {
                appId,
                type: dbStream.provider,
                liveStreamId: _id,
                awsStreamId: streamId,

                startTime,
                endTime,
                duration,
              },
            },
            {
              upsert: true,
            }
          );
      }
    );

    await Promise.allSettled(promises);

    return true;
  } finally {
    client.close();
  }
}

async function startStreamWatcher(
  channelArn: string,
  streamId: string,
  dbStream: LiveStreamType
) {
  const stepfunctions = new StepFunctions({
    region: REGION,
  });
  const stateMachineParams = {
    name: LIVE_STREAM_WATCHER_STATE_MACHINE_NAME,
    roleArn: LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE,
    type: 'STANDARD',
    definition: JSON.stringify(
      {
        Comment: 'LiveStream duration checker',
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
  };

  const { stateMachineArn } = await stepfunctions
    .createStateMachine(stateMachineParams)
    .promise();

  const execParams = {
    stateMachineArn,
    name: `${STAGE}-${dbStream._id}-${streamId}-${Date.now()}`,
    input: JSON.stringify({
      channelArn,
      streamId,
      dbStreamId: dbStream._id,
      appId: dbStream.appId,
      delay: 60,
    }),
  };

  const { executionArn } = await stepfunctions
    .startExecution(execParams)
    .promise();

  return executionArn;
}

export async function handleStreamStarted(
  resources: [string, ...string[]],
  streamId: string
) {
  const [channelArn] = resources;

  const dbStream = await getDbStreamFromChannelArn(channelArn);
  if (dbStream) {
    await startStreamWatcher(channelArn, streamId, dbStream);
  }
}

export async function handleStreamEnded(resources: [string, ...string[]]) {
  const [channelArn] = resources;

  await recomputeStreamDurations(channelArn);
}

export async function handleStreamError(resources: [string, ...string[]]) {
  const [channelArn] = resources;

  await recomputeStreamDurations(channelArn);
}

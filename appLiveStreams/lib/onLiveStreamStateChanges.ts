import IVS, { StreamSessionSummary } from 'aws-sdk/clients/ivs';
import StepFunctions from 'aws-sdk/clients/stepfunctions';
import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import { AppLiveStreamType } from './appLiveStreamTypes';

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

const { COLL_APP_LIVE_STREAMS } = mongoCollections;

const { IVS_REGION } = process.env;

const ivs = new IVS({
  apiVersion: '2020-07-14',
  region: IVS_REGION,
});

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

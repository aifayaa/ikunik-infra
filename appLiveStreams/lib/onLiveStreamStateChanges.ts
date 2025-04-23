import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import { AppLiveStreamType } from './appLiveStreamTypes';

const { COLL_APP_LIVE_STREAMS } = mongoCollections;

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

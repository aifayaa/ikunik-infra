import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import {
  IVSRealTimeClient,
  ListParticipantsCommand,
  ListStageSessionsCommand,
} from '@aws-sdk/client-ivs-realtime';
import { AppLiveStreamType } from './appLiveStreamEntities';
import { promiseExecUntilTrue } from '@libs/utils';

const { IVS_REGION } = process.env;

const { COLL_APP_LIVE_STREAMS } = mongoCollections;

const ivsRTClient = new IVSRealTimeClient({
  region: IVS_REGION,
});

export type CountAppLiveStreamViewersInputType = {
  dbStreamId: string;
  appId: string;
  delay: number;
};

type CountAppLiveStreamViewersOutputType = {
  retry: boolean;
  [key: string]: any;
};

async function getCurrentSessionId(dbStream: AppLiveStreamType) {
  let sessionId: string | null = null;
  let nextToken: string | null = null;

  await promiseExecUntilTrue(async () => {
    const listStageSessionsParams = new ListStageSessionsCommand({
      stageArn: dbStream.aws.ivsStageArn,
      ...(nextToken ? { nextToken } : {}),
    });

    const { stageSessions, nextToken: nextToken2 } = await ivsRTClient.send(
      listStageSessionsParams
    );

    stageSessions?.forEach(({ startTime, endTime, sessionId: sessionId2 }) => {
      if (startTime && !endTime && sessionId2) {
        sessionId = sessionId2;
      }
    });

    if (!sessionId && nextToken2) {
      nextToken = nextToken2;
      return false;
    }

    return true;
  });

  return sessionId;
}

async function getCurrentViewersCount(
  dbStream: AppLiveStreamType,
  sessionId: string
) {
  let nextToken: string | null = null;
  let viewersCount = 0;

  await promiseExecUntilTrue(async () => {
    const listParticipantsParams = new ListParticipantsCommand({
      stageArn: dbStream.aws.ivsStageArn,
      sessionId,
      maxResults: 100,
      filterByState: 'CONNECTED',
      ...(nextToken ? { nextToken } : {}),
    });

    const { participants, nextToken: nextToken2 } = await ivsRTClient.send(
      listParticipantsParams
    );

    const viewers = (participants || []).filter(
      (participant) => participant.published === false
    );
    viewersCount += viewers.length;

    if (nextToken2) {
      nextToken = nextToken2;
      return false;
    }

    return true;
  });

  return viewersCount;
}

export default async function countAppLiveStreamViewers({
  dbStreamId,
  appId,
}: CountAppLiveStreamViewersInputType): Promise<CountAppLiveStreamViewersOutputType> {
  const client = await MongoClient.connect();

  try {
    const dbStream = (await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .findOne({
        _id: dbStreamId,
        appId,
      })) as AppLiveStreamType | null;

    if (!dbStream) {
      return {
        error: `Stream ${dbStreamId} not found (app ${appId})`,
        retry: false,
      };
    }

    if (dbStream.state.isExpired || !dbStream.state.isStreaming) {
      return {
        isExpired: dbStream.state.isExpired,
        isStreaming: dbStream.state.isStreaming,
        retry: false,
      };
    }

    const sessionId = await getCurrentSessionId(dbStream);

    if (!sessionId) {
      await client
        .db()
        .collection(COLL_APP_LIVE_STREAMS)
        .updateOne(
          {
            _id: dbStreamId,
            appId,
          },
          { $set: { 'state.isStreaming': false } }
        );
      return {
        error: 'Cannot find running stream session',
        retry: false,
      };
    }

    const viewersCount = await getCurrentViewersCount(dbStream, sessionId);

    const maxViewersCount =
      viewersCount > dbStream.state.maxViewersCount
        ? viewersCount
        : dbStream.state.maxViewersCount;

    await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .updateOne(
        {
          _id: dbStreamId,
          appId,
          'state.isStreaming': true,
          'state.isExpired': false,
        },
        {
          $set: {
            'state.viewersCount': viewersCount,
            'state.maxViewersCount': maxViewersCount,
            'state.lastUpdate': new Date(),
          },
        }
      );

    return { retry: true };
  } finally {
    await client.close();
  }
}

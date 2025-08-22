import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import {
  IVSRealTimeClient,
  ListParticipantsCommand,
  ListStageSessionsCommand,
} from '@aws-sdk/client-ivs-realtime';
import {
  AppLiveStreamRecordingType,
  AppLiveStreamType,
} from './appLiveStreamEntities';
import { promiseExecUntilTrue } from '@libs/utils';
import refreshLiveStreamRecordings from './refreshLiveStreamRecordings';
import { postAALSArticle, uploadImageFromUrl } from './articleCreationUtils';
import { formatMessage, intlInit } from '@libs/intl/intl';
import { UserType } from '@users/lib/userEntity';

const { IVS_REGION, REGION } = process.env;

const { COLL_APP_LIVE_STREAMS, COLL_USERS } = mongoCollections;

const MINIMUM_DELAY_FOR_ENDED_RECORDINGS_MS = 10 * 60 * 1000;

const ivsRTClient = new IVSRealTimeClient({
  region: IVS_REGION,
});

function getRegionLang() {
  if (REGION === 'us-east-1') return 'en';
  if (REGION === 'eu-west-3') return 'fr';

  return 'en';
}

type SFNCheckAppLiveStreamOutputRetryType = {
  retry: true;
  delay: number;
  retryCount?: number;
  error?: string;
  message?: string;
};

type SFNCheckAppLiveStreamOutputStopType = {
  retry: false;
  error?: string;
};

type SFNCheckAppLiveStreamOutputType =
  | SFNCheckAppLiveStreamOutputRetryType
  | SFNCheckAppLiveStreamOutputStopType;

export type SFNCheckAppLiveStreamInputType = {
  liveStreamId: string;
  appId: string;
  delay: number;
  streamWatcherId: string;
  lastExec?: {
    Payload: SFNCheckAppLiveStreamOutputRetryType;
  };
};

async function getCurrentSessionId(liveStream: AppLiveStreamType) {
  let sessionId: string | null = null;
  let nextToken: string | null = null;

  await promiseExecUntilTrue(async () => {
    const listStageSessionsParams = new ListStageSessionsCommand({
      stageArn: liveStream.aws.ivsStageArn,
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
  liveStream: AppLiveStreamType,
  sessionId: string
) {
  let nextToken: string | null = null;
  let viewersCount = 0;

  await promiseExecUntilTrue(async () => {
    const listParticipantsParams = new ListParticipantsCommand({
      stageArn: liveStream.aws.ivsStageArn,
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

type CountAppLiveStreamViewersParamsType = {
  delay: number;
  retryCount: number;
  liveStream: AppLiveStreamType;
};

async function countAppLiveStreamViewers(
  { liveStream, delay, retryCount }: CountAppLiveStreamViewersParamsType,
  { client }: { client: any }
): Promise<SFNCheckAppLiveStreamOutputType> {
  const sessionId = await getCurrentSessionId(liveStream);

  if (!sessionId) {
    await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .updateOne(
        {
          _id: liveStream._id,
          appId: liveStream.appId,
        },
        { $set: { 'state.isStreaming': false } }
      );

    if (retryCount > 0) {
      return {
        message: `Cannot find running stream session, retrying ${retryCount} time(s)`,
        retryCount: retryCount - 1,
        delay,
        retry: true,
      };
    }

    return {
      error: 'Cannot find running stream session',
      retry: false,
    };
  }

  const viewersCount = await getCurrentViewersCount(liveStream, sessionId);

  const maxViewersCount =
    viewersCount > liveStream.state.maxViewersCount
      ? viewersCount
      : liveStream.state.maxViewersCount;

  await client
    .db()
    .collection(COLL_APP_LIVE_STREAMS)
    .updateOne(
      {
        _id: liveStream._id,
        appId: liveStream.appId,
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

  return { retry: true, delay };
}

function formatDateTime(date: Date, lang: string) {
  const LANGS: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
  };

  return date.toLocaleDateString(LANGS[lang] || 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function createRecordingArticle(
  recording: AppLiveStreamRecordingType,
  liveStream: AppLiveStreamType,
  { client }: { client: any }
): Promise<string | null> {
  if (recording.state !== 'ended') {
    throw new Error('Should never happen');
  }
  if (recording.duration < 60 * 1000) {
    // No thumbnail for recordings shorter than 60 seconds
    return null;
  }

  const imageId = await uploadImageFromUrl(
    `${recording.baseUrl}/${recording.root}/${recording.thumbnailPath}`,
    liveStream.createdBy,
    liveStream.appId
  );

  const lang = getRegionLang();
  intlInit(lang);

  const user = (await client
    .db()
    .collection(COLL_USERS)
    .findOne({ _id: liveStream.createdBy })) as UserType | null;

  if (!user) return null;

  const streamDateTime = formatDateTime(recording.start, lang);
  const username = user.profile.username || user.username;

  const notificationTitle = formatMessage(
    'appLiveStreams:notifications.new_recording_replay.title',
    {
      username,
    }
  );

  const articleTitle = formatMessage(
    'appLiveStreams:replay_press_article.title',
    {
      username,
      date: streamDateTime,
    }
  );

  const articleId = await postAALSArticle(
    {
      autoNotify: true,
      autoPublish: true,
      categoriesId: [liveStream.categoryId],
      md: `<crowdaa-aals-recording-playback liveStreamId="${liveStream._id}" recordingId="${recording.root}" fullscreen="true"></crowdaa-aals-recording-playback>`,
      pictureId: imageId,
      title: articleTitle,
      notificationContent: '',
      notificationTitle: notificationTitle,
    },
    { appId: liveStream.appId, userId: liveStream.createdBy }
  );

  return articleId;
}

async function processRecording(
  recording: AppLiveStreamRecordingType,
  liveStream: AppLiveStreamType,
  { client }: { client: any }
): Promise<boolean> {
  if (recording.state === 'started') {
    return true;
  }

  if (recording.state === 'failed') {
    return false;
  }

  if (recording.state === 'ended') {
    if (recording.pressArticleId) {
      return false;
    }

    const now = new Date();
    if (
      now.getTime() - recording.end.getTime() <=
      MINIMUM_DELAY_FOR_ENDED_RECORDINGS_MS
    ) {
      return true;
    }

    const pressArticleId = await createRecordingArticle(recording, liveStream, {
      client,
    });

    if (pressArticleId) {
      recording.pressArticleId = pressArticleId;

      await client
        .db()
        .collection(COLL_APP_LIVE_STREAMS)
        .updateOne(
          {
            _id: liveStream._id,
            appId: liveStream.appId,
            'recordings.root': recording.root,
          },
          {
            $set: {
              'recordings.$.pressArticleId': pressArticleId,
            },
          }
        );
    }

    return false;
  }

  return false;
}

export default async function sfnCheckAppLiveStream({
  liveStreamId,
  appId,
  delay,
  streamWatcherId,
  lastExec,
}: SFNCheckAppLiveStreamInputType): Promise<SFNCheckAppLiveStreamOutputType> {
  const client = await MongoClient.connect();

  try {
    const liveStream = (await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .findOne({
        _id: liveStreamId,
        appId,
      })) as AppLiveStreamType | null;

    if (!liveStream) {
      return {
        error: `Stream ${liveStreamId} not found (app ${appId})`,
        retry: false,
      };
    }

    if (liveStream.streamWatcherId !== streamWatcherId) {
      return {
        retry: false,
        error: `Invalid ID provided (${streamWatcherId} ≠ ${liveStream.streamWatcherId}), a new runner probably took our place, exiting`,
      };
    }

    if (!liveStream.state.isExpired && liveStream.state.isStreaming) {
      const retryCount =
        typeof lastExec?.Payload.retryCount === 'number'
          ? lastExec.Payload.retryCount
          : 5;

      let ret = await countAppLiveStreamViewers(
        { liveStream, delay, retryCount },
        { client }
      );

      if (!ret.retry) {
        await client
          .db()
          .collection(COLL_APP_LIVE_STREAMS)
          .updateOne(
            {
              _id: liveStream._id,
              appId: liveStream.appId,
              'state.isStreaming': true,
              'state.isExpired': false,
            },
            {
              $set: {
                'state.isStreaming': false,
              },
            }
          );

        ret = {
          retry: true,
          message: ret.error,
          delay: 30,
        };
      }

      return ret;
    }

    const { recordings } = await refreshLiveStreamRecordings(
      appId,
      liveStreamId
    );

    if (!recordings) {
      const retryCount =
        typeof lastExec?.Payload.retryCount === 'number'
          ? lastExec.Payload.retryCount
          : 10;

      if (retryCount > 0) {
        return {
          retry: true,
          delay: 30,
          retryCount: retryCount - 1,
        };
      }

      return {
        retry: false,
        error: 'Could not find any recordings to process',
      };
    }

    const promises = recordings.map(async (recording) => {
      return await processRecording(recording, liveStream, { client });
    });

    const results = await Promise.allSettled(promises);
    const retryableIndex = results.findIndex(
      (x) => x.status === 'fulfilled' && x.value === true
    );

    if (retryableIndex >= 0) {
      return { retry: true, delay: 60 };
    }

    return { retry: false };
  } finally {
    await client.close();
  }
}

/* eslint-disable import/no-relative-packages */
import zlib from 'node:zlib';
import S3 from 'aws-sdk/clients/s3';
import MediaConvert from 'aws-sdk/clients/mediaconvert';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ERROR_TYPE_NOT_FOUND,
  LIVE_STREAM_NOT_FOUND_CODE,
  PANIC_CODE,
} from '@libs/httpResponses/errorCodes';
import {
  AppLiveStreamLogLineType,
  AppLiveStreamRecordingType,
  AppLiveStreamType,
} from './appLiveStreamEntities';
import { promiseExecUntilTrue, PromiseQueue } from '@libs/utils';
import { promisify } from 'node:util';

const zlibGunzipPromise = promisify(zlib.gunzip);

const { IVS_BUCKET, IVS_REGION } = process.env as {
  IVS_BUCKET: string;
  IVS_REGION: string;
};

const { COLL_APP_LIVE_STREAMS, COLL_APP_LIVE_STREAMS_LOGS } = mongoCollections;

const s3 = new S3({
  apiVersion: '2006-03-01',
  region: IVS_REGION,
});

const mediaconvert = new MediaConvert({
  apiVersion: '2017-08-29',
  region: IVS_REGION,
});

let endpointUrl: null | undefined | string = null;

/** Customer-specific endpoint is required, so we need to fetch it first */
async function loadCSMediaConvertEndpoint() {
  if (endpointUrl === null) {
    const { Endpoints } = await mediaconvert.describeEndpoints({}).promise();
    if (!Endpoints) {
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        PANIC_CODE,
        'Could not fetch mediaconvert endpoint URL'
      );
    }

    endpointUrl = Endpoints[0].Url;
  }

  const csmediaconvert = new MediaConvert({
    apiVersion: '2017-08-29',
    region: IVS_REGION,
    endpoint: endpointUrl,
  });

  return csmediaconvert;
}

async function listAllS3FilesIn(
  s3prefix: string,
  s3bucket: string,
  filter?: (fileName: string) => 'add' | 'skip' | 'stop'
) {
  let continuationToken;
  let stop = false;
  const files: Array<string> = [];

  do {
    const query: {
      Bucket: string;
      Prefix: string;
      ContinuationToken?: string;
    } = {
      Bucket: s3bucket,
      Prefix: s3prefix,
    };
    if (continuationToken) query.ContinuationToken = continuationToken;
    // eslint-disable-next-line no-await-in-loop
    const listResponse = await s3.listObjectsV2(query).promise();

    if (listResponse.Contents) {
      for (let { Key = '' } of listResponse.Contents) {
        if (filter) {
          const result = filter(Key);
          if (result === 'add') {
            files.push(Key);
          } else if (result === 'stop') {
            stop = true;
            break;
          }
        } else {
          files.push(Key);
        }
      }
    }

    if (listResponse.IsTruncated)
      continuationToken = listResponse.NextContinuationToken;
    else continuationToken = null;
  } while (continuationToken && !stop);

  return files;
}

type AALSRecordingsStatusType = 'started' | 'ended' | 'failed';

async function loadS3RecordingsData(streamArnId: string) {
  const s3Prefix = `${streamArnId}`;
  const keyMatch = /\/events\/recording-(started|ended|failed)\.json$/;
  const keyStateMatch = /^.*\/events\/recording-(started|ended|failed)\.json$/;
  const recordingsByState: Record<
    string,
    Partial<Record<AALSRecordingsStatusType, string>>
  > = {};

  await listAllS3FilesIn(s3Prefix, IVS_BUCKET, (key: string) => {
    if (key.match(keyMatch)) {
      const root = key.replace(keyMatch, '');
      const state = key.replace(
        keyStateMatch,
        '$1'
      ) as AALSRecordingsStatusType;
      if (!recordingsByState[root]) recordingsByState[root] = {};
      recordingsByState[root][state] = key;
    }

    return 'skip';
  });

  return recordingsByState;
}

async function loadS3LogsData(chatRoomArn: string) {
  const [_arn, _aws, _service, awsRegion, accountId, serviceId] =
    chatRoomArn.split(':');
  const roomId = serviceId.split('/').pop() as string;
  const s3Prefix = `AWSLogs/${accountId}/IVSChatLogs/1.0/${awsRegion}/room_${roomId}`;
  const keyMatch = new RegExp(
    `/${accountId}_IVSChatLogs_1.0_${awsRegion}_room_${roomId}_.*.log.gz$`
  );

  const filesList = await listAllS3FilesIn(
    s3Prefix,
    IVS_BUCKET,
    (key: string) => {
      if (key.match(keyMatch)) {
        return 'add';
      }

      return 'skip';
    }
  );

  filesList.sort();

  return filesList;
}

type AALSChatLineType = {
  event_timestamp: string;
  type: 'MESSAGE';
  payload: {
    Type: 'MESSAGE';
    Id: string;
    RequestId: string;
    Attributes: {
      crowdaaUserId: string;
      messageType?: 'heart_reaction' | 'stream_status' | 'viewer_join';
      reactionData?: string;
      username: string;
    };
    Content: string;
    SendTime: string;
    Sender: { UserId: string; Attributes: {} };
  };
  version: string;
};

// Examples :
// const sig = {
//   event_timestamp: '2025-08-14T05:48:40.415Z',
//   type: 'MESSAGE',
//   payload: {
//     Type: 'MESSAGE',
//     Id: '9ojK4zRlO8QQ',
//     RequestId: 'd9da9232-6141-443b-9d76-f980c0cad092',
//     Attributes: {
//       crowdaaUserId: 'ehgt2JeRmcuyCLymg',
//       messageType: 'stream_status',
//       reactionData:
//         '{"type":"stream_status","statusType":"camera","value":true,"timestamp":1755150519851}',
//       username: 'Max',
//     },
//     Content: 'Status Update',
//     SendTime: '2025-08-14T05:48:40.41551437Z',
//     Sender: { UserId: '689d78a4fb507800029a7639', Attributes: {} },
//   },
//   version: '1.0',
// };
// const msg = {
//   event_timestamp: '2025-08-14T05:50:05.533Z',
//   type: 'MESSAGE',
//   payload: {
//     Type: 'MESSAGE',
//     Id: '1pmL91z2hNTx',
//     RequestId: '318fd00d-b456-4bf4-8624-db3258784d29',
//     Attributes: { crowdaaUserId: 'ehgt2JeRmcuyCLymg', username: 'Max' },
//     Content: 'Naaaa',
//     SendTime: '2025-08-14T05:50:05.533134508Z',
//     Sender: { UserId: '689d78a4fb507800029a7639', Attributes: {} },
//   },
//   version: '1.0',
// };

function makeObjectIdFromTime(time: Date) {
  const timeHex: string = ObjectID.createFromTime(time).toHexString();
  const genericObjectIdHex: string = new ObjectID().toHexString();

  return ObjectID.createFromHexString(
    `${timeHex.substring(0, 8)}${genericObjectIdHex.substring(8)}`
  ) as ObjectID;
}

async function loadStreamChatLogs(
  dbLiveStream: AppLiveStreamType,
  { client }: { client: any }
) {
  let loadedMessages = 0;
  const chatFilesToProcess = await loadS3LogsData(
    dbLiveStream.aws.ivsChatRoomArn
  );

  if (chatFilesToProcess.length > 0) {
    const filesQueue = new PromiseQueue(30, false);
    const linesQueue = new PromiseQueue(80, false);

    const processLine = async (s3Key: string, chatLine: AALSChatLineType) => {
      const time = new Date(
        chatLine.payload.SendTime || chatLine.event_timestamp
      );
      const lineId = makeObjectIdFromTime(time);

      const { crowdaaUserId, username, ...attributes } =
        chatLine.payload.Attributes;

      const toInsert: AppLiveStreamLogLineType = {
        _id: lineId,
        appId: dbLiveStream.appId,
        liveStreamId: dbLiveStream._id,
        s3bucket: IVS_BUCKET,
        s3Key,
        awsId: chatLine.payload.Id,
        attributes,
        content: chatLine.payload.Content,
        userId: crowdaaUserId,
        username: username,
        sendTime: new Date(chatLine.payload.SendTime),
      };
      await client
        .db()
        .collection(COLL_APP_LIVE_STREAMS_LOGS)
        .insertOne(toInsert);
      loadedMessages += 1;
    };

    const processFile = async (s3Key: string) => {
      const haveDataFromFile = await client
        .db()
        .collection(COLL_APP_LIVE_STREAMS_LOGS)
        .findOne({
          appId: dbLiveStream.appId,
          streamId: dbLiveStream._id,
          s3bucket: IVS_BUCKET,
          s3Key,
        });

      if (haveDataFromFile) return;

      const s3data = await s3
        .getObject({
          Bucket: IVS_BUCKET,
          Key: s3Key,
        })
        .promise();

      if (!Buffer.isBuffer(s3data.Body)) return;

      const rawChatLogs = await zlibGunzipPromise(s3data.Body);

      const chatLogs = rawChatLogs.toString('utf8').split('\n');

      for (let jsonLine of chatLogs) {
        try {
          const chatLine = JSON.parse(jsonLine) as AALSChatLineType;

          await linesQueue.add(processLine(s3Key, chatLine));
        } catch (error) {}
      }
    };

    await promiseExecUntilTrue(async () => {
      const s3Key = chatFilesToProcess.pop();
      if (!s3Key) return true;

      await filesQueue.add(processFile(s3Key));

      return false;
    });

    await filesQueue.flush();
    await linesQueue.flush();
  }

  return loadedMessages;
}

async function getStreamAVRecordings(
  dbLiveStream: AppLiveStreamType,
  { client }: { client: any }
) {
  let csmediaconvert: null | MediaConvert = null;

  const recordingsByState: Record<
    string,
    Partial<Record<AALSRecordingsStatusType, string>>
  > = await loadS3RecordingsData(
    dbLiveStream.aws.ivsStageArn.split('/').pop() as string
  );

  if (Object.keys(recordingsByState).length > 0) {
    const dbRecordings: Array<AppLiveStreamRecordingType> = [];

    const getRecordingWithRoot = (
      root: string,
      {
        state,
        start,
        duration,
        baseUrl,
      }: Omit<AppLiveStreamRecordingType, 'root'>
    ) => {
      if (!dbLiveStream.recordings)
        return {
          state,
          start,
          duration,
          baseUrl,
          root,
        } as AppLiveStreamRecordingType;

      for (let i = 0; i < dbLiveStream.recordings.length; i += 1) {
        const current = dbLiveStream.recordings[i];
        if (current.root === root) {
          return {
            ...JSON.parse(JSON.stringify(current)),
            state,
            start,
            duration,
            baseUrl,
            root,
          } as AppLiveStreamRecordingType;
        }
      }

      return {
        state,
        start,
        duration,
        baseUrl,
        root,
      } as AppLiveStreamRecordingType;
    };

    await Promise.allSettled(
      Object.keys(recordingsByState).map(async (s3Root) => {
        let state: AALSRecordingsStatusType;
        if (recordingsByState[s3Root].ended) state = 'ended';
        else if (recordingsByState[s3Root].failed) state = 'failed';
        else state = 'started';

        const s3data = await s3
          .getObject({
            Bucket: IVS_BUCKET,
            Key: recordingsByState[s3Root][state] as string,
          })
          .promise();
        if (!s3data.Body) {
          throw new CrowdaaError(
            ERROR_TYPE_INTERNAL_EXCEPTION,
            PANIC_CODE,
            'Invalid response from AWS S3 storage'
          );
        }

        const jsonText = s3data.Body.toString('utf8');
        const json = JSON.parse(jsonText);

        const currentRecording = getRecordingWithRoot(s3Root, {
          state,
          start: new Date(json.recording_started_at),
          duration: json.media.hls.duration_ms,
          baseUrl: `https://${IVS_BUCKET}.s3.amazonaws.com`,
        });

        if (currentRecording.state === 'ended') {
          if (json.recording_ended_at)
            currentRecording.end = new Date(json.recording_ended_at);
          if (json.duration_ms) currentRecording.duration = json.duration_ms;
          if (json.media) {
            if (json.media.hls && json.media.hls.path) {
              currentRecording.playlist = [
                json.media.hls.path,
                json.media.hls.playlist,
              ].join('/');
            }

            if (json.media.latest_thumbnail) {
              currentRecording.thumbnailPath = [
                json.media.latest_thumbnail.path,
                json.media.latest_thumbnail.renditions[0].path,
                'latest.jpg',
              ].join('/');
            }
          }
        }

        dbRecordings.push(currentRecording);
      })
    );

    if (dbRecordings.length > 0) {
      dbRecordings.sort((a, b) => a.start.getTime() - b.start.getTime());

      await client
        .db()
        .collection(COLL_APP_LIVE_STREAMS)
        .updateOne(
          { _id: dbLiveStream._id },
          {
            $set: {
              recordings: dbRecordings,
            },
          }
        );
    }

    return dbRecordings;
  }

  return null;
}

export default async (appId: string, liveStreamId: string) => {
  const client = await MongoClient.connect();
  try {
    const dbLiveStream = (await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .findOne({
        _id: liveStreamId,
        appId,
      })) as AppLiveStreamType | null;
    if (!dbLiveStream) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        LIVE_STREAM_NOT_FOUND_CODE,
        `Cannot find live stream '${liveStreamId}' for app '${appId}'`
      );
    }

    const recordings = await getStreamAVRecordings(dbLiveStream, { client });

    if (recordings) {
      dbLiveStream.recordings = recordings;

      const loadedMessages = await loadStreamChatLogs(dbLiveStream, { client });

      if (loadedMessages > 0) {
        const chatMessagesCount = await client
          .db()
          .collection(COLL_APP_LIVE_STREAMS_LOGS)
          .find({
            appId: dbLiveStream.appId,
            liveStreamId: dbLiveStream._id,
          })
          .count();

        dbLiveStream.messagesCount = chatMessagesCount;

        await client
          .db()
          .collection(COLL_APP_LIVE_STREAMS)
          .updateOne(
            { _id: dbLiveStream._id },
            {
              $set: {
                messagesCount: chatMessagesCount,
              },
            }
          );
      }
    }

    return dbLiveStream;
  } finally {
    client.close();
  }
};

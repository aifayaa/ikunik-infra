/* eslint-disable import/no-relative-packages */
import {
  CreateStageCommand,
  DeleteStageCommand,
  IVSRealTimeClient,
} from '@aws-sdk/client-ivs-realtime';
import { CreateRoomCommand, IvschatClient } from '@aws-sdk/client-ivschat';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ALS_EXPIRATION_DELAY_MIN, ALS_EXPIRATION_DELAY_MS } from './utils';
import { AppLiveStreamType } from './appLiveStreamEntities';
import {
  CATEGORY_NOT_FOUND_CODE,
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ERROR_TYPE_NOT_FOUND,
  PANIC_CODE,
} from '@libs/httpResponses/errorCodes';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';

const {
  IVS_REGION,
  STAGE,
  LIVE_STREAM_RECORDING_CONFIGURATION_ARN, // Created manually
  LIVE_STREAM_LOGGING_CONFIGURATION_ARN, // Created manually
} = process.env as {
  IVS_REGION: string;
  LIVE_STREAM_RECORDING_CONFIGURATION_ARN: string;
  LIVE_STREAM_LOGGING_CONFIGURATION_ARN: string;
  STAGE: string;
};

const { COLL_APP_LIVE_STREAMS, COLL_PRESS_CATEGORIES } = mongoCollections;

const ivsRTClient = new IVSRealTimeClient({
  region: IVS_REGION,
});

const ivsChatClient = new IvschatClient({
  region: IVS_REGION,
});

type CreateAppLiveStreamParamsType = {
  userId: string;
  categoryId: string;
};

async function createChatRoom(name: string) {
  const roomParams = new CreateRoomCommand({
    maximumMessageLength: 500,
    maximumMessageRatePerSecond: 40,
    name,
    loggingConfigurationIdentifiers: [LIVE_STREAM_LOGGING_CONFIGURATION_ARN],
  });

  const { arn: ivsChatRoomArn } = await ivsChatClient.send(roomParams);
  if (!ivsChatRoomArn) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Could not create Chat Room for stage ${name}`
    );
  }

  return { ivsChatRoomArn };
}

export async function createAppLiveStream(
  appId: string,
  { userId, categoryId }: CreateAppLiveStreamParamsType
) {
  const client = await MongoClient.connect();
  try {
    const dbCategory = await client
      .db()
      .collection(COLL_PRESS_CATEGORIES)
      .findOne({ _id: categoryId, appId });

    if (!dbCategory) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        CATEGORY_NOT_FOUND_CODE,
        `Category ID ${categoryId} not found!`
      );
    }

    const now = new Date();
    const _id = new ObjectID().toString();
    const ivsStageName = `${STAGE}-${appId}-${userId}-${_id}`;

    const expireDateTime = new Date(now);
    expireDateTime.setTime(expireDateTime.getTime() + ALS_EXPIRATION_DELAY_MS);

    const stageParams = new CreateStageCommand({
      name: ivsStageName,
      participantTokenConfigurations: [
        {
          duration: ALS_EXPIRATION_DELAY_MIN,
          capabilities: ['PUBLISH'],
        },
      ],
      autoParticipantRecordingConfiguration: {
        storageConfigurationArn: LIVE_STREAM_RECORDING_CONFIGURATION_ARN,
        mediaTypes: ['AUDIO_VIDEO'],
        thumbnailConfiguration: {
          // ParticipantThumbnailConfiguration
          targetIntervalSeconds: 60,
          storage: ['LATEST'],
          recordingMode: 'INTERVAL',
        },
      },
    });

    const { participantTokens, stage } = await ivsRTClient.send(stageParams);

    if (
      !stage ||
      !stage.arn ||
      !participantTokens ||
      !participantTokens[0].token ||
      !participantTokens[0].participantId
    ) {
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        PANIC_CODE,
        'Missing participant token and/or stage in response'
      );
    }

    const userStreamToken = participantTokens[0].token;
    const userParticipantId = participantTokens[0].participantId;

    let ivsChatRoomArn: string | undefined;
    try {
      const results = await createChatRoom(ivsStageName);
      ivsChatRoomArn = results.ivsChatRoomArn;
    } catch (e) {
      await ivsRTClient.send(new DeleteStageCommand({ arn: stage.arn }));
      throw e;
    }

    const dbLiveStream: AppLiveStreamType = {
      _id,
      createdAt: now,
      createdBy: userId,
      appId,
      categoryId,
      startDateTime: now,
      expireDateTime,
      state: {
        isExpired: false,
        isStreaming: false,
        lastUpdate: new Date(),
        viewersCount: 0,
        maxViewersCount: 0,
      },

      userStreamToken,
      userParticipantId,

      aws: {
        ivsStageName,
        ivsStageArn: stage.arn,
        ivsChatRoomArn,
      },
    };

    await client.db().collection(COLL_APP_LIVE_STREAMS).insertOne(dbLiveStream);

    return { ...dbLiveStream, awsRegion: IVS_REGION };
  } finally {
    await client.close();
  }
}

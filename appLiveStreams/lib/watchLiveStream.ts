import {
  CreateParticipantTokenCommand,
  DisconnectParticipantCommand,
  IVSRealTimeClient,
} from '@aws-sdk/client-ivs-realtime';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  ALS_CHAT_EXPIRATION_DELAY_MIN,
  ALS_EXPIRATION_DELAY_MIN,
  checkUserPermissionsOnStream,
} from './utils';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  LIVE_STREAM_NOT_FOUND_CODE,
  NOT_ENOUGH_PERMISSIONS_CODE,
  PANIC_CODE,
} from '@libs/httpResponses/errorCodes';
import BadgeChecker from '@libs/badges/BadgeChecker';
import {
  AppLiveStreamTokenType,
  AppLiveStreamType,
} from './appLiveStreamEntities';
import { CreateChatTokenCommand, IvschatClient } from '@aws-sdk/client-ivschat';

const { IVS_REGION } = process.env as { IVS_REGION: string };

const ivsRTClient = new IVSRealTimeClient({
  region: IVS_REGION,
});

const ivsChatClient = new IvschatClient({
  region: IVS_REGION,
});

const { COLL_APP_LIVE_STREAMS_TOKENS, COLL_APP_LIVE_STREAMS } =
  mongoCollections;

export default async function watchLiveStream(
  appId: string,
  liveStreamId: string,
  deviceId: string,
  userId: string | null
) {
  const client = await MongoClient.connect();
  const badgeChecker = new BadgeChecker(appId);

  try {
    await badgeChecker.init;

    const dbLiveStream = (await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .findOne({ _id: liveStreamId, appId })) as AppLiveStreamType | null;

    if (!dbLiveStream) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        LIVE_STREAM_NOT_FOUND_CODE,
        `Cannot find live stream '${liveStreamId}' for app '${appId}'`
      );
    }

    const { canView, previewOnly } = await checkUserPermissionsOnStream(
      dbLiveStream,
      userId
    );

    if (!canView) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        NOT_ENOUGH_PERMISSIONS_CODE,
        'Not enough permissions to view this stream'
      );
    }

    const chatUserId = `${liveStreamId}-${userId}-${deviceId}`;
    const expiresDelay = previewOnly ? 1 : ALS_EXPIRATION_DELAY_MIN;
    const chatExpiresDelay = previewOnly ? 1 : ALS_CHAT_EXPIRATION_DELAY_MIN;
    const expiresAt = new Date(Date.now() + expiresDelay * 60 * 1000);
    const dbAlsToken = (await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS_TOKENS)
      .findOne({
        liveStreamId,
        appId,
        deviceId,
        userId,
      })) as AppLiveStreamTokenType | null;
    let alsToken: Omit<AppLiveStreamTokenType, '_id'> | null = dbAlsToken;

    if (dbAlsToken && dbAlsToken.previewOnly !== previewOnly) {
      await client.db().collection(COLL_APP_LIVE_STREAMS_TOKENS).deleteOne({
        _id: dbAlsToken._id,
      });
      await ivsRTClient.send(
        new DisconnectParticipantCommand({
          stageArn: dbLiveStream.aws.ivsStageArn,
          participantId: dbAlsToken.participantId,
          reason: 'Permissions updated uppon new connection',
        })
      );

      alsToken = null;
    }

    if (!alsToken) {
      const { participantToken } = await ivsRTClient.send(
        new CreateParticipantTokenCommand({
          stageArn: dbLiveStream.aws.ivsStageArn,
          duration: expiresDelay,
          capabilities: ['SUBSCRIBE'],
        })
      );

      if (
        !participantToken ||
        !participantToken.participantId ||
        !participantToken.token
      ) {
        throw new CrowdaaError(
          ERROR_TYPE_INTERNAL_EXCEPTION,
          PANIC_CODE,
          'Missing participant token in response'
        );
      }

      const { participantId, token } = participantToken;

      const tokenParams = new CreateChatTokenCommand({
        roomIdentifier: dbLiveStream.aws.ivsChatRoomArn,
        userId: chatUserId,
        capabilities: ['SEND_MESSAGE'],
        sessionDurationInMinutes: chatExpiresDelay,
      });

      const { token: chatToken } = await ivsChatClient.send(tokenParams);

      if (!chatToken) {
        throw new CrowdaaError(
          ERROR_TYPE_INTERNAL_EXCEPTION,
          PANIC_CODE,
          'Missing participant token in response'
        );
      }

      alsToken = {
        liveStreamId,
        appId,
        deviceId,
        participantId,
        userId,
        token,
        expiresAt,
        previewOnly,
      };

      await client
        .db()
        .collection(COLL_APP_LIVE_STREAMS_TOKENS)
        .insertOne(alsToken);
    }

    return {
      awsRegion: IVS_REGION,
      liveStreamId,
      appId,
      deviceId,
      participantId: alsToken.participantId,
      token: alsToken.token,
      previewOnly,
    };
  } finally {
    await badgeChecker.close();
    await client.close();
  }
}

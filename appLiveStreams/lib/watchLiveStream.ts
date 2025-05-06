import {
  CreateParticipantTokenCommand,
  DisconnectParticipantCommand,
  IVSRealTimeClient,
} from '@aws-sdk/client-ivs-realtime';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ALS_EXPIRATION_DELAY_MIN } from './utils';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  CATEGORY_NOT_FOUND_CODE,
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  NOT_ENOUGH_PERMISSIONS_CODE,
  UNMANAGED_EXCEPTION_CODE,
} from '@libs/httpResponses/errorCodes';
import BadgeChecker from '@libs/badges/BadgeChecker';
import {
  AppLiveStreamTokenType,
  AppLiveStreamType,
} from './appLiveStreamTypes';
import { PressCategoryType } from 'pressCategories/lib/pressCategoriesTypes';
import { UserType } from '@users/lib/userEntity';

const { IVS_REGION } = process.env;

const ivsRTClient = new IVSRealTimeClient({
  region: IVS_REGION,
});

const {
  COLL_APP_LIVE_STREAMS_TOKENS,
  COLL_APP_LIVE_STREAMS,
  COLL_PRESS_CATEGORIES,
  COLL_USERS,
} = mongoCollections;

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
      throw new Error('live_stream_not_found');
    }

    const category = (await client
      .db()
      .collection(COLL_PRESS_CATEGORIES)
      .findOne({
        _id: dbLiveStream.categoryId,
        appId,
      })) as PressCategoryType | null;

    if (!category) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        CATEGORY_NOT_FOUND_CODE,
        `Category ID ${dbLiveStream.categoryId} not found!`
      );
    }

    let canView = true;
    let previewOnly = false;
    if (category.badges && category.badges.list.length > 0) {
      canView = false;
      previewOnly = true;
      if (userId) {
        badgeChecker.registerBadges(category.badges.list.map(({ id }) => id));

        const user = (await client.db().collection(COLL_USERS).findOne({
          _id: userId,
          appId,
        })) as UserType | null;

        if (user) {
          if (user.badges && user.badges.length > 0) {
            badgeChecker.registerBadges(user.badges.map(({ id }) => id));
          }

          await badgeChecker.loadBadges();

          const results = await badgeChecker.checkBadges(
            user.badges,
            category.badges,
            { userId, appId }
          );

          if (results.canList) {
            canView = true;
          }

          if (results.canRead && results.canPreview) {
            previewOnly = false;
          }
        }
      }
    }

    if (!canView) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        NOT_ENOUGH_PERMISSIONS_CODE,
        'Not enough permissions to view this stream'
      );
    }

    let expiresDelay = previewOnly ? 1 : ALS_EXPIRATION_DELAY_MIN;
    let expiresAt = new Date(Date.now() + expiresDelay * 60 * 1000);
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
          UNMANAGED_EXCEPTION_CODE,
          'Missing participant token in response'
        );
      }

      const { participantId, token } = participantToken;

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

/* eslint-disable import/no-relative-packages */
import {
  CreateStageCommand,
  IVSRealTimeClient,
} from '@aws-sdk/client-ivs-realtime';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ALS_EXPIRATION_DELAY_MIN, ALS_EXPIRATION_DELAY_MS } from './utils';
import { AppLiveStreamType } from './appLiveStreamTypes';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  UNMANAGED_EXCEPTION_CODE,
} from '@libs/httpResponses/errorCodes';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';

const { IVS_REGION, STAGE } = process.env;

const { COLL_APP_LIVE_STREAMS, COLL_PICTURES } = mongoCollections;

const ivsRTClient = new IVSRealTimeClient({
  region: IVS_REGION,
});

type CreateAppLiveStreamParamsType = {
  userId: string;
  title: string;
  imageId: string;
};

export async function createAppLiveStream(
  appId: string,
  { userId, title, imageId }: CreateAppLiveStreamParamsType
) {
  const client = await MongoClient.connect();
  try {
    const now = new Date();
    const _id = new ObjectID().toString();
    const ivsStageName = `${STAGE}-${appId}-${userId}-${_id}`;

    const expireDateTime = new Date(now);
    expireDateTime.setTime(expireDateTime.getTime() + ALS_EXPIRATION_DELAY_MS);

    const dbImage = client
      .db()
      .collection(COLL_PICTURES)
      .findOne({ _id: imageId, appId });

    const stageParams = new CreateStageCommand({
      name: ivsStageName,
      participantTokenConfigurations: [
        {
          duration: ALS_EXPIRATION_DELAY_MIN,
          capabilities: ['PUBLISH'],
        },
      ],
    });

    const { participantTokens, stage } = await ivsRTClient.send(stageParams);

    if (!participantTokens || !stage) {
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        UNMANAGED_EXCEPTION_CODE,
        'Missing participant token and/or stage in response'
      );
    }

    const userToken = participantTokens[0].token;
    const userParticipantId = participantTokens[0].participantId;

    const dbLiveStream = {
      _id,
      createdAt: now,
      createdBy: userId,
      appId,
      title,
      ...(dbImage
        ? {
            image: {
              _id: imageId,
              thumbUrl: dbImage.thumbUrl,
              mediumUrl: dbImage.mediumUrl,
              largeUrl: dbImage.largeUrl,
              pictureUrl: dbImage.pictureUrl,
            },
          }
        : {}),
      startDateTime: now,
      expireDateTime,
      state: {
        isExpired: false,
        isStreaming: false,
        lastUpdate: new Date(),
        viewersCount: 0,
      },

      userStreamToken: userToken,
      userParticipantId,

      aws: {
        ivsStageName,
        ivsStageArn: stage.arn,
      },
    } as AppLiveStreamType;

    await client.db().collection(COLL_APP_LIVE_STREAMS).insertOne(dbLiveStream);

    return dbLiveStream;
  } finally {
    client.close();
  }
}

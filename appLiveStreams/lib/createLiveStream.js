/* eslint-disable import/no-relative-packages */
import {
  CreateStageCommand,
  IVSRealTimeClient,
} from '@aws-sdk/client-ivs-realtime';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ALS_EXPIRATION_DELAY_MIN, ALS_EXPIRATION_DELAY_MS } from './utils.ts';

const { IVS_REGION, STAGE } = process.env;

const { COLL_APP_LIVE_STREAMS } = mongoCollections;

const ivsRTClient = new IVSRealTimeClient({
  region: IVS_REGION,
});

export async function createAppLiveStream(appId, { userId }) {
  const client = await MongoClient.connect();
  try {
    const now = new Date();
    const _id = new ObjectID().toString();
    const ivsStageName = `${STAGE}-${appId}-${userId}-${_id}`;

    const expireDateTime = new Date(now);
    expireDateTime.setTime(expireDateTime.getTime() + ALS_EXPIRATION_DELAY_MS);

    const stageParams = {
      name: ivsStageName,
      participantTokenConfigurations: [
        {
          duration: ALS_EXPIRATION_DELAY_MIN,
          capabilities: ['PUBLISH'],
        },
      ],
    };

    const { participantTokens, stage } = await ivsRTClient.send(
      new CreateStageCommand(stageParams)
    );

    const userToken = participantTokens[0].token;
    const userParticipantId = participantTokens[0].participantId;

    const dbLiveStream = {
      _id,
      createdAt: now,
      createdBy: userId,
      appId,
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
    };

    await client.db().collection(COLL_APP_LIVE_STREAMS).insertOne(dbLiveStream);

    return dbLiveStream;
  } finally {
    client.close();
  }
}

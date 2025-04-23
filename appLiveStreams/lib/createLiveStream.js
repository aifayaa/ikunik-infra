/* eslint-disable import/no-relative-packages */
import {
  CreateStageCommand,
  IVSRealTimeClient,
} from '@aws-sdk/client-ivs-realtime';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { IVS_REGION, STAGE } = process.env;

const { COLL_APP_LIVE_STREAMS } = mongoCollections;

const ivsRTClient = new IVSRealTimeClient({
  region: IVS_REGION,
});

const ALS_EXPIRATION_DELAY_MIN = 2 * 24 * 60; // 2 days
const ALS_EXPIRATION_DELAY_MS = 1 * ALS_EXPIRATION_DELAY_MIN * 60 * 1000;

export async function createAppLiveStream(appId, { userId }) {
  const client = await MongoClient.connect();
  try {
    const now = new Date();
    const dbId = new ObjectID().toString();
    const ivsStageName = `${appId}-${STAGE}-${userId}-${dbId}`;

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

    const dbLiveStream = {
      _id: new ObjectID().toString(),
      createdAt: now,
      createdBy: userId,
      appId,
      startDateTime: now,
      expireDateTime,
      expired: false,

      appStreamToken: userToken,

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

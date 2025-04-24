import {
  CreateParticipantTokenCommand,
  IVSRealTimeClient,
} from '@aws-sdk/client-ivs-realtime';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ALS_EXPIRATION_DELAY_MIN } from './utils.ts';

const { IVS_REGION } = process.env;

const ivsRTClient = new IVSRealTimeClient({
  region: IVS_REGION,
});

const { COLL_APP_LIVE_STREAMS, COLL_APP_LIVE_STREAMS_TOKENS } =
  mongoCollections;

export default async function watchLiveStream(appId, liveStreamId, deviceId) {
  const client = await MongoClient.connect();
  try {
    const dbLiveStream = await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .findOne({ _id: liveStreamId, appId });

    if (!dbLiveStream) {
      throw new Error('live_stream_not_found');
    }

    let alsToken = await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS_TOKENS)
      .findOne({ liveStreamId, appId, deviceId });

    if (!alsToken) {
      const { participantToken } = await ivsRTClient.send(
        new CreateParticipantTokenCommand({
          stageArn: dbLiveStream.aws.ivsStageArn,
          duration: ALS_EXPIRATION_DELAY_MIN,
          capabilities: ['SUBSCRIBE'],
        })
      );

      const { participantId, token } = participantToken;

      alsToken = {
        liveStreamId,
        appId,
        deviceId,
        participantId,
        token,
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
    };
  } finally {
    client.close();
  }
}

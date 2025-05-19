/* eslint-disable import/no-relative-packages */
import {
  DeleteStageCommand,
  IVSRealTimeClient,
} from '@aws-sdk/client-ivs-realtime';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { AppLiveStreamType } from './appLiveStreamTypes';
import { DeleteRoomCommand, IvschatClient } from '@aws-sdk/client-ivschat';

const { IVS_REGION } = process.env;

const { COLL_APP_LIVE_STREAMS, COLL_APP_LIVE_STREAMS_TOKENS } =
  mongoCollections;

const ivsRTClient = new IVSRealTimeClient({
  region: IVS_REGION,
});

const ivsChatClient = new IvschatClient({
  region: IVS_REGION,
});

async function deleteLiveStreamInfra(dbLiveStream: AppLiveStreamType) {
  try {
    await ivsChatClient.send(
      new DeleteRoomCommand({
        identifier: dbLiveStream.aws.ivsChatRoomArn,
      })
    );
  } catch (e) {
    /* Even if that fails, we shall be able to delete the stream, which will delete the key too */
  }

  try {
    await ivsRTClient.send(
      new DeleteStageCommand({
        arn: dbLiveStream.aws.ivsStageArn,
      })
    );
  } catch (e) {
    /* Even if that fails, we shall be able to delete the stream, which will delete the key too */
  }
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
      })) as AppLiveStreamType | undefined;

    if (!dbLiveStream) {
      throw new Error('live_stream_not_found');
    }

    if (!dbLiveStream.state.isExpired) {
      await deleteLiveStreamInfra(dbLiveStream);
    }

    await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .deleteOne({ _id: liveStreamId });

    await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS_TOKENS)
      .deleteMany({ liveStreamId });

    return dbLiveStream;
  } finally {
    client.close();
  }
};

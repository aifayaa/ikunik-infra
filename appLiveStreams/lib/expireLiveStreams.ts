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

const ivsClient = new IVSRealTimeClient({
  region: IVS_REGION,
});

const ivsChatClient = new IvschatClient({
  region: IVS_REGION,
});

async function expireLiveStream(dbLiveStream: AppLiveStreamType, client: any) {
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
    await ivsClient.send(
      new DeleteStageCommand({
        arn: dbLiveStream.aws.ivsStageArn,
      })
    );
  } catch (e) {
    /* Even if that fails, we shall be able to delete the stream, which will delete the key too */
  }

  await client
    .db()
    .collection(COLL_APP_LIVE_STREAMS)
    .updateOne(
      { _id: dbLiveStream._id },
      { $set: { 'state.isExpired': true } }
    );

  await client
    .db()
    .collection(COLL_APP_LIVE_STREAMS_TOKENS)
    .deleteMany({ liveStreamId: dbLiveStream._id });

  return dbLiveStream._id;
}

/* To be used internally only */
export default async () => {
  const client = await MongoClient.connect();
  try {
    const promises: Array<Promise<string>> = [];

    await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .find({
        expireDateTime: { $lt: new Date() },
        'state.isExpired': false,
      })
      .forEach((dbLiveStream: AppLiveStreamType) => {
        promises.push(expireLiveStream(dbLiveStream, client));
      });

    const results = await Promise.allSettled(promises);
    // eslint-disable-next-line no-console
    console.log('Ran expiration process, results :', results);
  } finally {
    client.close();
  }
};

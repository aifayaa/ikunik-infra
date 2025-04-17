/* eslint-disable import/no-relative-packages */
import {
  DeleteChannelCommand,
  DeleteStreamKeyCommand,
  IvsClient,
  StopStreamCommand,
} from '@aws-sdk/client-ivs';
import {
  DeleteStageCommand,
  IVSRealTimeClient,
  StopCompositionCommand,
} from '@aws-sdk/client-ivs-realtime';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  LIVESTREAM_PROVIDER_AWS_IVS,
  LIVESTREAM_PROVIDER_AWS_IVS_APP,
} from './constants';

const { IVS_REGION } = process.env;

const { COLL_LIVE_STREAMS } = mongoCollections;

const ivsClient = new IvsClient({
  region: IVS_REGION,
});

const ivsRTClient = new IVSRealTimeClient({
  region: IVS_REGION,
});

async function expireLiveStream(dbLiveStream, client, dbUpdate = true) {
  try {
    await ivsClient.send(
      new DeleteStreamKeyCommand({
        arn: dbLiveStream.aws.streamKeyArn,
      })
    );
  } catch (e) {
    /* Even if that fails, we shall be able to delete the stream, which will delete the key too */
  }

  try {
    await ivsClient.send(new StopStreamCommand({ arn: dbLiveStream.aws.arn }));
  } catch (e) {
    /* Do nothing, it was probably stopped... */
  }

  await ivsClient.send(new DeleteChannelCommand({ arn: dbLiveStream.aws.arn }));

  if (dbUpdate) {
    await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .updateOne({ _id: dbLiveStream._id }, { $set: { expired: true } });
  }
}

async function expireAppLiveStream(dbLiveStream, client) {
  try {
    await ivsRTClient.send(
      new StopCompositionCommand({
        arn: dbLiveStream.aws.compositionArn,
      })
    );
  } catch (e) {
    /* Even if that fails, we shall be able to delete the stream, which will delete the key too */
  }

  await expireLiveStream(dbLiveStream, client, false);

  try {
    await ivsRTClient.send(
      new DeleteStageCommand({
        arn: dbLiveStream.aws.stageArn,
      })
    );
  } catch (e) {
    /* Even if that fails, we shall be able to delete the stream, which will delete the key too */
  }

  await client
    .db()
    .collection(COLL_LIVE_STREAMS)
    .updateOne({ _id: dbLiveStream._id }, { $set: { expired: true } });
}

/* To be used internally only */
export default async () => {
  const client = await MongoClient.connect();
  try {
    const promises = [];

    await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .find({
        provider: LIVESTREAM_PROVIDER_AWS_IVS,
        expireDateTime: { $lt: new Date() },
        expired: false,
      })
      .forEach((dbLiveStream) => {
        promises.push(expireLiveStream(dbLiveStream, client));
      });

    await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .find({
        provider: LIVESTREAM_PROVIDER_AWS_IVS_APP,
        expireDateTime: { $lt: new Date() },
        expired: false,
      })
      .forEach((dbLiveStream) => {
        promises.push(expireAppLiveStream(dbLiveStream, client));
      });

    const results = await Promise.allSettled(promises);
    // eslint-disable-next-line no-console
    console.log('Ran expiration process, results :', results);
  } finally {
    client.close();
  }
};

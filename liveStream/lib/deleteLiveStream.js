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

async function deleteLiveStreamInfra(dbLiveStream) {
  if (dbLiveStream.provider === LIVESTREAM_PROVIDER_AWS_IVS_APP) {
    try {
      await ivsRTClient.send(
        new StopCompositionCommand({
          arn: dbLiveStream.aws.compositionArn,
        })
      );
    } catch (e) {
      /* Even if that fails, we shall be able to delete the stream, which will delete the key too */
    }
  }

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

  if (dbLiveStream.provider === LIVESTREAM_PROVIDER_AWS_IVS_APP) {
    try {
      await ivsRTClient.send(
        new DeleteStageCommand({
          arn: dbLiveStream.aws.stageArn,
        })
      );
    } catch (e) {
      /* Even if that fails, we shall be able to delete the stream, which will delete the key too */
    }
  }
}

export default async (appId, liveStreamId) => {
  const client = await MongoClient.connect();
  try {
    const dbLiveStream = await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .findOne({
        _id: liveStreamId,
        appId,
        provider: {
          $in: [LIVESTREAM_PROVIDER_AWS_IVS, LIVESTREAM_PROVIDER_AWS_IVS_APP],
        },
      });

    if (!dbLiveStream) {
      throw new Error('live_stream_not_found');
    }

    if (!dbLiveStream.expired) {
      await deleteLiveStreamInfra(dbLiveStream);
    }

    await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .deleteOne({ _id: liveStreamId });

    return true;
  } finally {
    client.close();
  }
};

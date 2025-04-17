/* eslint-disable import/no-relative-packages */
import {
  CreateChannelCommand,
  CreateRecordingConfigurationCommand,
  GetRecordingConfigurationCommand,
  IvsClient,
  ListRecordingConfigurationsCommand,
} from '@aws-sdk/client-ivs';
import {
  CreateEncoderConfigurationCommand,
  CreateStageCommand,
  IVSRealTimeClient,
  ListEncoderConfigurationsCommand,
  StartCompositionCommand,
} from '@aws-sdk/client-ivs-realtime';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import Random from '../../libs/account_utils/random.ts';
import { filterOutput } from './utils';
import {
  LIVESTREAM_PROVIDER_AWS_IVS,
  LIVESTREAM_PROVIDER_AWS_IVS_APP,
} from './constants';

const { IVS_BUCKET, IVS_REGION, STAGE } = process.env;

const { COLL_LIVE_STREAMS } = mongoCollections;

const ivsClient = new IvsClient({
  region: IVS_REGION,
});

const ivsRTClient = new IVSRealTimeClient({
  region: IVS_REGION,
});

const NORMAL_EXPIRATION_DELAY_MS = 7 * 86400 * 1000; // 7 days
const APP_EXPIRATION_DELAY_MIN = 2 * 24 * 60; // 2 days
const APP_EXPIRATION_DELAY_MS = 1 * APP_EXPIRATION_DELAY_MIN * 60 * 1000;

async function getRecordingConfiguration() {
  const awsRecordingName = `crowdaa-liveStream-recording-${STAGE}`;

  const { recordingConfigurations } = await ivsClient.send(
    new ListRecordingConfigurationsCommand({})
  );

  let recordingConfiguration;
  for (let i = 0; i < recordingConfigurations.length; i += 1) {
    const current = recordingConfigurations[i];
    if (current.name === awsRecordingName) {
      recordingConfiguration = current;
    }
  }

  if (!recordingConfiguration) {
    const response = await ivsClient.send(
      new CreateRecordingConfigurationCommand({
        name: awsRecordingName,
        destinationConfiguration: {
          s3: {
            bucketName: IVS_BUCKET,
          },
        },
      })
    );
    recordingConfiguration = response.recordingConfiguration;
  }

  const recordingConfigurationArn = recordingConfiguration.arn;

  if (recordingConfiguration.state === 'ACTIVE') {
    return recordingConfigurationArn;
  }

  await new Promise((resolve, reject) => {
    const refreshRecordingState = async () => {
      const rec = await ivsClient.send(
        new GetRecordingConfigurationCommand({
          arn: recordingConfigurationArn,
        })
      );

      return rec.recordingConfiguration.state;
    };

    /**
     * We do not check for lambda expiration time here since it should not matter anyway,
     * it will be created once only. It usually takes a few seconds anyway.
     */
    const retry = () => {
      refreshRecordingState()
        .then((state) => {
          if (state === 'ACTIVE') {
            resolve();
          } else {
            setTimeout(retry, 1000);
          }
        })
        .catch(reject);
    };

    retry();
  });

  return recordingConfigurationArn;
}

export default async (appId, { name, startDateTime, userId }) => {
  const client = await MongoClient.connect();
  try {
    const dbName = `${appId}-${STAGE}-${name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const query = {
      appId,
      name: dbName,
      provider: LIVESTREAM_PROVIDER_AWS_IVS,
    };

    let dbLiveStream = await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .findOne(query);

    if (dbLiveStream) {
      throw new Error('live_stream_already_exists');
    }

    const recordingConfigurationArn = await getRecordingConfiguration();

    const ivsParams = {
      name: dbName,
      authorized: false,
      latencyMode: 'LOW',
      type: 'STANDARD',
      recordingConfigurationArn,
    };

    const { channel, streamKey } = await ivsClient.send(
      new CreateChannelCommand(ivsParams)
    );

    const expireDateTime = new Date(startDateTime);
    expireDateTime.setTime(
      expireDateTime.getTime() + NORMAL_EXPIRATION_DELAY_MS
    );

    dbLiveStream = {
      _id: `${Date.now()}-${Random.id()}`,
      provider: LIVESTREAM_PROVIDER_AWS_IVS,
      createdAt: new Date(),
      createdBy: userId,
      appId,
      name: dbName,
      displayName: name,
      startDateTime: new Date(startDateTime),
      expireDateTime,
      expired: false,

      ingestEndpoint: channel.ingestEndpoint,
      streamKey: streamKey.value,
      playbackUrl: channel.playbackUrl,

      aws: {
        arn: channel.arn,
        recordingConfigurationArn,
        streamKeyArn: streamKey.arn,

        latencyMode: channel.latencyMode,
        type: channel.type,
        authorized: channel.authorized,
      },
    };

    await client.db().collection(COLL_LIVE_STREAMS).insertOne(dbLiveStream);

    return filterOutput(dbLiveStream);
  } finally {
    client.close();
  }
};

export async function createAppLiveStream(appId, { userId }) {
  const client = await MongoClient.connect();
  try {
    const now = new Date();
    const name = `APP-${now.toISOString()}`;
    const dbName = `${appId}-${STAGE}-${name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    const recordingConfigurationArn = await getRecordingConfiguration();

    const ivsParams = {
      name: dbName,
      authorized: false,
      latencyMode: 'LOW',
      type: 'STANDARD',
      recordingConfigurationArn,
    };

    const { channel, streamKey } = await ivsClient.send(
      new CreateChannelCommand(ivsParams)
    );

    const expireDateTime = new Date(now);
    expireDateTime.setTime(expireDateTime.getTime() + APP_EXPIRATION_DELAY_MS);

    const dbLiveStream = {
      _id: `${Date.now()}-${Random.id()}`,
      provider: LIVESTREAM_PROVIDER_AWS_IVS_APP,
      createdAt: new Date(),
      createdBy: userId,
      appId,
      name: dbName,
      displayName: name,
      startDateTime: now,
      expireDateTime,
      expired: false,

      ingestEndpoint: channel.ingestEndpoint,
      streamKey: streamKey.value,
      playbackUrl: channel.playbackUrl,

      aws: {
        arn: channel.arn,
        recordingConfigurationArn,
        streamKeyArn: streamKey.arn,

        latencyMode: channel.latencyMode,
        type: channel.type,
        authorized: channel.authorized,
      },
    };

    await client.db().collection(COLL_LIVE_STREAMS).insertOne(dbLiveStream);

    const stageParams = {
      name: dbName,
      participantTokenConfigurations: [
        {
          duration: APP_EXPIRATION_DELAY_MIN,
          capabilities: ['PUBLISH'],
        },
      ],
    };

    const { participantTokens, stage } = await ivsRTClient.send(
      new CreateStageCommand(stageParams)
    );

    const userToken = participantTokens[0].token;

    await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .updateOne(
        { _id: dbLiveStream._id },
        {
          $set: { 'aws.stageArn': stage.arn, appStreamToken: userToken },
        }
      );

    const encoderName = `app-streams-encoder-${STAGE}`;
    const encoders = await ivsRTClient.send(
      new ListEncoderConfigurationsCommand({})
    );
    let encoder = encoders.encoderConfigurations.find(
      (item) => item.name === encoderName
    );

    if (!encoder) {
      const encoderParams = {
        name: `app-streams-encoder-${STAGE}`,
        video: {
          width: 720,
          height: 1280,
          framerate: 30,
          bitrate: 3500,
        },
      };

      const newAwsEncoder = await ivsRTClient.send(
        new CreateEncoderConfigurationCommand(encoderParams)
      );

      encoder = newAwsEncoder.encoderConfiguration;
    }

    await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .updateOne(
        { _id: dbLiveStream._id },
        {
          $set: { 'aws.encoderArn': encoder.arn },
        }
      );

    const compositionParams = {
      stageArn: stage.arn,
      layout: {
        pip: {
          omitStoppedVideo: false,
          videoFillMode: 'COVER',
          pipBehavior: 'STATIC',
          pipPosition: 'BOTTOM_RIGHT',
        },
      },
      destinations: [
        {
          channel: {
            // ChannelDestinationConfiguration
            channelArn: channel.arn,
            encoderConfigurationArn: encoder.arn,
          },
        },
      ],
    };

    const { composition } = await ivsRTClient.send(
      new StartCompositionCommand(compositionParams)
    );

    await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .updateOne(
        { _id: dbLiveStream._id },
        {
          $set: { 'aws.compositionArn': composition.arn },
        }
      );

    const finalDbLiveStream = await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .findOne({ _id: dbLiveStream._id });

    return filterOutput(finalDbLiveStream);
  } finally {
    client.close();
  }
}

import IVS from 'aws-sdk/clients/ivs';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import Random from '../../libs/account_utils/random';
import { filterOutput } from './utils';

const {
  IVS_BUCKET,
  IVS_REGION,
  STAGE,
} = process.env;

const {
  COLL_LIVE_STREAM,
} = mongoCollections;

const ivs = new IVS({
  apiVersion: '2020-07-14',
  region: IVS_REGION,
});

const EXPIRATION_DELAY = 7 * 86400 * 1000;

async function getRecordingConfiguration() {
  const awsRecordingName = `crowdaa-liveStream-recording-${STAGE}`;

  const { recordingConfigurations } = await ivs.listRecordingConfigurations({}).promise();

  let recordingConfiguration;
  for (let i = 0; i < recordingConfigurations.length; i += 1) {
    const current = recordingConfigurations[i];
    if (current.name === awsRecordingName) {
      recordingConfiguration = current;
    }
  }

  if (!recordingConfiguration) {
    const response = await ivs.createRecordingConfiguration({
      name: awsRecordingName,
      destinationConfiguration: {
        s3: {
          bucketName: IVS_BUCKET,
        },
      },
    }).promise();
    recordingConfiguration = response.recordingConfiguration;
  }

  const recordingConfigurationArn = recordingConfiguration.arn;

  if (recordingConfiguration.state === 'ACTIVE') {
    return (recordingConfigurationArn);
  }

  await new Promise((resolve, reject) => {
    const refreshRecordingState = async () => {
      const rec = await ivs.getRecordingConfiguration({
        arn: recordingConfigurationArn,
      }).promise();

      return (rec.recordingConfiguration.state);
    };

    /**
     * We do not check for lambda expiration time here since it should not matter anyway,
     * it will be created once only. It usually takes a few seconds anyway.
     */
    const retry = () => {
      refreshRecordingState().then((state) => {
        if (state === 'ACTIVE') {
          resolve();
        } else {
          setTimeout(retry, 1000);
        }
      }).catch(reject);
    };

    retry();
  });

  return (recordingConfigurationArn);
}

export default async (appId, {
  name,
  startDateTime,
}) => {
  const client = await MongoClient.connect();
  try {
    const dbName = `${appId}-${STAGE}-${name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const query = {
      appId,
      name: dbName,
      provider: 'aws-ivs',
    };

    let dbLiveStream = await client
      .db()
      .collection(COLL_LIVE_STREAM)
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

    const { channel, streamKey } = await ivs.createChannel(ivsParams).promise();

    const expireDateTime = new Date(startDateTime);
    expireDateTime.setTime(expireDateTime.getTime() + EXPIRATION_DELAY);

    dbLiveStream = {
      _id: `${Date.now()}-${Random.id()}`,
      provider: 'aws-ivs',
      createdAt: new Date(),
      appId,
      name: dbName,
      displayName: name,
      startDateTime: new Date(startDateTime),
      expireDateTime,
      expired: false,

      ingestEndpoint: channel.ingestEndpoint,
      streamKey: streamKey.value,
      playbackUrl: channel.playbackUrl,

      aws: { /** Mostly for debugging purpose */
        arn: channel.arn,
        recordingConfigurationArn,
        streamKeyArn: streamKey.arn,

        latencyMode: channel.latencyMode,
        type: channel.type,
        authorized: channel.authorized,
      },
    };

    await client
      .db()
      .collection(COLL_LIVE_STREAM)
      .insertOne(dbLiveStream);

    return (filterOutput(dbLiveStream));
  } finally {
    client.close();
  }
};

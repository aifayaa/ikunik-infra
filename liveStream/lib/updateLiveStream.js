/* eslint-disable import/no-relative-packages */
import IVS from 'aws-sdk/clients/ivs';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { filterOutput } from './utils';
import {
  LIVESTREAM_PROVIDER_AWS_IVS,
  LIVESTREAM_PROVIDER_AWS_IVS_APP,
} from './constants';

const { IVS_REGION, STAGE } = process.env;

const { COLL_LIVE_STREAMS } = mongoCollections;

const ivs = new IVS({
  apiVersion: '2020-07-14',
  region: IVS_REGION,
});

const EXPIRATION_DELAY = 7 * 86400 * 1000;

export default async (appId, liveStreamId, { name, startDateTime }) => {
  const client = await MongoClient.connect();
  try {
    const dbName = `${appId}-${STAGE}-${name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const query = {
      appId,
      _id: liveStreamId,
      provider: {
        $in: [LIVESTREAM_PROVIDER_AWS_IVS, LIVESTREAM_PROVIDER_AWS_IVS_APP],
      },
    };

    const dbLiveStream = await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .findOne(query);

    if (!dbLiveStream) {
      throw new Error('live_stream_not_found');
    }

    const update = {};

    if (dbName !== dbLiveStream.name) {
      if (!dbLiveStream.expired) {
        await ivs
          .updateChannel({
            arn: dbLiveStream.aws.arn,
            name: dbName,
          })
          .promise();
      }

      update.dbName = dbName;
      update.displayName = name;
      dbLiveStream.dbName = dbName;
      dbLiveStream.displayName = name;
    }
    startDateTime = new Date(startDateTime);
    if (
      startDateTime.getTime() !== dbLiveStream.startDateTime.getTime() &&
      !dbLiveStream.expired
    ) {
      update.startDateTime = startDateTime;
      dbLiveStream.startDateTime = startDateTime;

      const expireDateTime = new Date(startDateTime);
      expireDateTime.setTime(expireDateTime.getTime() + EXPIRATION_DELAY);

      update.expireDateTime = expireDateTime;
      dbLiveStream.expireDateTime = expireDateTime;
    }

    if (Object.keys(update).length >= 0) {
      await client
        .db()
        .collection(COLL_LIVE_STREAMS)
        .updateOne({ _id: liveStreamId }, { $set: update });
    }

    return filterOutput(dbLiveStream);
  } finally {
    client.close();
  }
};

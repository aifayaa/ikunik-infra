/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { LIVESTREAM_PROVIDER_AWS_IVS } from './constants';

const { COLL_LIVE_STREAMS } = mongoCollections;

/* To be used internally only */
export default async (appId, liveStreamId) => {
  const client = await MongoClient.connect();
  try {
    return await client.db().collection(COLL_LIVE_STREAMS).findOne({
      _id: liveStreamId,
      appId,
      provider: LIVESTREAM_PROVIDER_AWS_IVS,
    });
  } finally {
    client.close();
  }
};

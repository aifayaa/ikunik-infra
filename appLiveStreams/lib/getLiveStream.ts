import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import { AppLiveStreamType } from './appLiveStreamEntities';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  LIVE_STREAM_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';

const { COLL_APP_LIVE_STREAMS } = mongoCollections;

export default async function getLiveStreamStats(
  liveStreamId: string,
  appId: string
) {
  const client = await MongoClient.connect();

  try {
    const liveStream = (await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .findOne({ _id: liveStreamId, appId })) as AppLiveStreamType;

    if (!liveStream) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        LIVE_STREAM_NOT_FOUND_CODE,
        `Cannot find live stream '${liveStreamId}' for app '${appId}'`
      );
    }

    return liveStream;
  } finally {
    await client.close();
  }
}

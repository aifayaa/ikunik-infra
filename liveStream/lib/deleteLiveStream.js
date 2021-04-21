import MongoClient from '../../libs/mongoClient';
import wowzaApi from './wowzaApi';
import { unsetDelayedAutoEnd, unsetDelayedAutoStart } from './autoStartManagement';

const {
  COLL_LIVE_STREAM,
  DB_NAME,
} = process.env;

export default async (appId, liveStreamId) => {
  const client = await MongoClient.connect();
  try {
    const dbLiveStream = await client
      .db(DB_NAME)
      .collection(COLL_LIVE_STREAM)
      .findOne({
        _id: liveStreamId,
        appId,
      });

    if (!dbLiveStream) {
      throw new Error('live_stream_not_found');
    }

    await wowzaApi('DELETE', `/live_streams/${dbLiveStream.wowzaId}`);

    await unsetDelayedAutoStart(dbLiveStream);
    await unsetDelayedAutoEnd(dbLiveStream);

    await client
      .db(DB_NAME)
      .collection(COLL_LIVE_STREAM)
      .deleteOne({ _id: liveStreamId });

    return (true);
  } finally {
    client.close();
  }
};

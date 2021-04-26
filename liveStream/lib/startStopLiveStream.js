import MongoClient from '../../libs/mongoClient';
import wowzaApi from './wowzaApi';
import { filterOutput } from './utils';

const {
  COLL_LIVE_STREAM,
  DB_NAME,
} = process.env;

export default async (appId, liveStreamId, start = true) => {
  const client = await MongoClient.connect();
  try {
    const query = {
      appId,
      _id: liveStreamId,
    };

    const dbLiveStream = await client
      .db(DB_NAME)
      .collection(COLL_LIVE_STREAM)
      .findOne(query);

    if (!dbLiveStream) {
      throw new Error('live_stream_not_found');
    }

    if (start) {
      if (dbLiveStream.state !== 'stopped') {
        throw new Error('live_stream_already_started');
      }
    } else if (dbLiveStream.state === 'stopped' || !dbLiveStream.state) {
      throw new Error('live_stream_already_stopped');
    }

    const response = await wowzaApi('PUT', `/live_streams/${dbLiveStream.wowzaId}/${start ? 'start' : 'stop'}`);
    const { state } = response.live_stream;

    const $set = {
      state,
    };
    await client
      .db(DB_NAME)
      .collection(COLL_LIVE_STREAM)
      .updateOne({ _id: liveStreamId }, { $set });

    return (filterOutput({ ...dbLiveStream, ...$set }));
  } finally {
    client.close();
  }
};

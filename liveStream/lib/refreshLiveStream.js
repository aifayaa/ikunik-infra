import MongoClient from '../../libs/mongoClient';
import wowzaApi from './wowzaApi';
import { filterOutput } from './utils';

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

    const dataResponse = await wowzaApi('GET', `/live_streams/${dbLiveStream.wowzaId}`);
    const liveStream = dataResponse.live_stream;

    const stateResponse = await wowzaApi('GET', `/live_streams/${dbLiveStream.wowzaId}/state`);
    const { state } = stateResponse.live_stream;

    const dbLiveStreamPatch = {
      state,
      inputParameters: liveStream.source_connection_information,
      hostedPageUrl: liveStream.hosted_page_url,
    };
    await client
      .db(DB_NAME)
      .collection(COLL_LIVE_STREAM)
      .updateOne({ _id: liveStreamId }, { $set: dbLiveStreamPatch });

    return (filterOutput({ ...dbLiveStream, ...dbLiveStreamPatch }));
  } finally {
    client.close();
  }
};

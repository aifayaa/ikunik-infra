import MongoClient from '../../libs/mongoClient';
import wowzaApi from './wowzaApi';
import { filterOutput } from './utils';
import { setDelayedAutoStart } from './autoStartManagement';
import { notifyAdminsOfStart } from './emailNotifications';

const {
  COLL_LIVE_STREAM,
  DB_NAME,
  STAGE,
} = process.env;

export default async (appId, liveStreamId, {
  name,
  height,
  width,
  broadcastLocation,
  startDateTime,
}) => {
  const client = await MongoClient.connect();
  try {
    const dbName = `${appId}-${STAGE}-${name}`;
    const query = {
      appId,
      _id: liveStreamId,
    };

    let dbLiveStream = await client
      .db(DB_NAME)
      .collection(COLL_LIVE_STREAM)
      .findOne(query);

    if (!dbLiveStream) {
      throw new Error('live_stream_not_found');
    }

    const liveStreamPostData = {
      name: dbName,
      aspect_ratio_height: height,
      aspect_ratio_width: width,
      broadcast_location: broadcastLocation,
      player_countdown_at: startDateTime,
    };
    const response = await wowzaApi('PATCH', `/live_streams/${dbLiveStream.wowzaId}`, { live_stream: liveStreamPostData });
    const liveStream = response.live_stream;

    const oldStartDate = dbLiveStream.startDateTime.getTime();

    dbLiveStream = {
      ...dbLiveStream,
      name: dbName,
      displayName: name,
      height,
      width,
      broadcastLocation,
      startDateTime: new Date(startDateTime),
      inputParameters: liveStream.source_connection_information || dbLiveStream.inputParameters,
      hostedPageUrl: liveStream.hosted_page_url || dbLiveStream.hostedPageUrl,
    };
    await client
      .db(DB_NAME)
      .collection(COLL_LIVE_STREAM)
      .updateOne({ _id: liveStreamId }, { $set: dbLiveStream });

    if (oldStartDate !== dbLiveStream.startDateTime.getTime() || !dbLiveStream.autoStartAwsArnId) {
      const {
        error,
        scheduled,
      } = await setDelayedAutoStart(dbLiveStream);

      await notifyAdminsOfStart(dbLiveStream._id, scheduled, error);
    }

    return (filterOutput(dbLiveStream));
  } finally {
    client.close();
  }
};

import MongoClient from '../../libs/mongoClient';
import Random from '../../libs/account_utils/random';
import wowzaApi from './wowzaApi';
import { filterOutput } from './utils';
import { setDelayedAutoStart } from './autoStartManagement';
import { notifyAdminsOfStart } from './emailNotifications';

const {
  COLL_LIVE_STREAM,
  DB_NAME,
  STAGE,
} = process.env;

export default async (appId, {
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
      name: dbName,
    };

    let dbLiveStream = await client
      .db(DB_NAME)
      .collection(COLL_LIVE_STREAM)
      .findOne(query);

    if (dbLiveStream) {
      throw new Error('live_stream_already_exists');
    }

    const liveStreamPostData = {
      name: dbName,
      aspect_ratio_height: height,
      aspect_ratio_width: width,
      broadcast_location: broadcastLocation,
      username: `login-${Random.id(4)}`,
      password: Random.secret(10),

      billing_mode: 'pay_as_you_go',
      encoder: 'other_rtmp',
      transcoder_type: 'transcoded',
      closed_caption_type: 'none',
      delivery_method: 'push',
      delivery_type: 'single-bitrate',
      disable_authentication: false,
      hosted_page: true,
      hosted_page_description: name,
      hosted_page_sharing_icons: false,
      hosted_page_title: 'Live Stream',
      low_latency: false, // Does not concern us on hosted page
      player_countdown: true,
      player_countdown_at: startDateTime,
      player_responsive: true,
      player_type: 'original_html5',
      recording: true,
      remove_hosted_page_logo_image: true,
      remove_player_logo_image: true,
      remove_player_video_poster_image: true,
      use_stream_source: false,
    };
    const response = await wowzaApi('POST', '/live_streams', { live_stream: liveStreamPostData });
    const liveStream = response.live_stream;

    dbLiveStream = {
      _id: `${Random.id()}-${liveStream.id}`,
      createdAt: new Date(liveStream.created_at),
      appId,
      name: dbName,
      displayName: name,
      height,
      width,
      broadcastLocation,
      state: 'stopped',
      startDateTime: new Date(startDateTime),
      wowzaId: liveStream.id,
      inputParameters: liveStream.source_connection_information,
      hostedPageUrl: liveStream.hosted_page_url,
    };
    await client
      .db(DB_NAME)
      .collection(COLL_LIVE_STREAM)
      .insertOne(dbLiveStream);

    /**
     * inputParameters contains an object like :
     *  {
          primary_server: 'rtmp://27e20f-sandbox.entrypoint.cloud.wowza.com/app-46Q5bz6l',
          host_port: 1935,
          stream_name: '4a43e8fb',
          disable_authentication: false,
          username: 'login-fx9H',
          password: 'iBb5p3YFXf'
        }
     */

    // Configuring auto-start
    const {
      error,
      scheduled,
    } = await setDelayedAutoStart(dbLiveStream);

    await notifyAdminsOfStart(dbLiveStream._id, scheduled, error);

    return (filterOutput(dbLiveStream));
  } finally {
    client.close();
  }
};

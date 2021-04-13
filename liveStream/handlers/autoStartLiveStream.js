import refreshLiveStream from '../lib/refreshLiveStream';
import startStopLiveStream from '../lib/startStopLiveStream';
import { unsetDelayedAutoStart } from '../lib/autoStartManagement';
import { notifyAdminsOfStart } from '../lib/emailNotifications';
import getLiveStream from '../lib/getLiveStream';

export default async ({ appId, liveStreamId }) => {
  let error = false;

  try {
    await getLiveStream(appId, liveStreamId);
  } catch (e) {
    // Skip everything if we can't find the live stream
    return;
  }

  try {
    const liveStream = await refreshLiveStream(appId, liveStreamId);
    if (liveStream.state === 'starting' || liveStream.state === 'started') {
      return;
    }

    await unsetDelayedAutoStart(liveStream);
    await startStopLiveStream(appId, liveStreamId, true);
  } catch (e) {
    error = e;
  }

  await notifyAdminsOfStart(liveStreamId, false, error);
};

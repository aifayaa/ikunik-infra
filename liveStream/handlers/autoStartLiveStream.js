import refreshLiveStream from '../lib/refreshLiveStream';
import startStopLiveStream from '../lib/startStopLiveStream';
import { unsetDelayedAutoEnd, unsetDelayedAutoStart } from '../lib/autoStartManagement';
import { notifyAdminsOfStart, notifyAdminsOfStop } from '../lib/emailNotifications';
import getLiveStream from '../lib/getLiveStream';

export default async ({ appId, liveStreamId, start }) => {
  let error = false;

  try {
    await getLiveStream(appId, liveStreamId);
  } catch (e) {
    // Skip everything if we can't find the live stream
    return;
  }

  try {
    const liveStream = await refreshLiveStream(appId, liveStreamId);

    if (start) {
      if (liveStream.state === 'starting' || liveStream.state === 'started') {
        return;
      }

      await unsetDelayedAutoStart(liveStream);
      await startStopLiveStream(appId, liveStreamId, true);
    } else {
      if (liveStream.state === 'stopped') {
        return;
      }

      await unsetDelayedAutoEnd(liveStream);
      const stopRetries = 5;

      for (let i = 0; i < stopRetries; i += 1) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await startStopLiveStream(appId, liveStreamId, false);
          error = false;
          i = stopRetries;
        } catch (e) {
          error = e;
        }
      }
    }
  } catch (e) {
    if (e.message !== 'live_stream_already_started' && e.message !== 'live_stream_already_stopped') {
      error = e;
    }
  }

  if (start) {
    await notifyAdminsOfStart(liveStreamId, false, error);
  } else {
    await notifyAdminsOfStop(liveStreamId, error);
  }
};

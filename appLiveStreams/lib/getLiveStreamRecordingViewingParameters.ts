/* eslint-disable import/no-relative-packages */
import getLiveStream from './getLiveStream';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  LIVE_STREAM_RECORDING_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';

export default async (
  appId: string,
  liveStreamId: string,
  recordingId: string
) => {
  const liveStream = await getLiveStream(liveStreamId, appId);

  if (
    !liveStream ||
    !liveStream.recordings ||
    liveStream.recordings.length === 0
  ) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      LIVE_STREAM_RECORDING_NOT_FOUND_CODE,
      `Cannot find recording ${recordingId} in live stream '${liveStreamId}' for app '${appId}'`
    );
  }

  let recording = null;
  for (let i = 0; i < liveStream.recordings.length && !recording; i += 1) {
    const current = liveStream.recordings[i];
    if (current.root === recordingId) {
      recording = current;
    }
  }

  if (!recording || recording.state !== 'ended') {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      LIVE_STREAM_RECORDING_NOT_FOUND_CODE,
      `Cannot find recording ${recordingId} in live stream '${liveStreamId}' for app '${appId}'`
    );
  }

  const viewingParams = {
    liveStreamId,
    recordingId: recording.root,
    playbackUrl: `${recording.baseUrl}/${recording.root}/${recording.playlist}`,
    thumbnailUrl: `${recording.baseUrl}/${recording.root}/${recording.thumbnailPath}`,
    start: recording.start.toISOString(),
    end: new Date(recording.start.getTime() + recording.duration).toISOString(),
    duration: recording.duration,
  };

  return viewingParams;
};

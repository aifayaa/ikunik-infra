import {
  checkLiveStreamDuration,
  CheckLiveStreamDurationInputType,
} from '../lib/checkLiveStreamDuration';

export default async (args: CheckLiveStreamDurationInputType) => {
  const extraResponseData = await checkLiveStreamDuration(args);
  return { success: true, ...extraResponseData };
};

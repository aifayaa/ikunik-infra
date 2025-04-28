/* eslint-disable import/no-relative-packages */
import countAppLiveStreamViewers, {
  CountAppLiveStreamViewersInputType,
} from 'appLiveStreams/lib/countAppLiveStreamViewers';

export default async (event: CountAppLiveStreamViewersInputType) => {
  try {
    await countAppLiveStreamViewers(event);
  } catch (e) {
    // TODO Handle me later, maybe?
    console.error('Error :', e);
  }
};

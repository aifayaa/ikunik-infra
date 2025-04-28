/* eslint-disable import/no-relative-packages */
import countAppLiveStreamViewers, {
  CountAppLiveStreamViewersInputType,
} from 'appLiveStreams/lib/countAppLiveStreamViewers';

export default async (event: CountAppLiveStreamViewersInputType) => {
  try {
    const ret = await countAppLiveStreamViewers(event);

    return ret;
  } catch (e) {
    // TODO Handle me later, maybe?
    console.error('Error :', e);
  }
};

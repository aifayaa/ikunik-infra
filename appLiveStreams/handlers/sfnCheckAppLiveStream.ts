/* eslint-disable import/no-relative-packages */
import sfnCheckAppLiveStream, {
  SFNCheckAppLiveStreamInputType,
} from 'appLiveStreams/lib/sfnCheckAppLiveStream';

export default async (event: SFNCheckAppLiveStreamInputType) => {
  try {
    const ret = await sfnCheckAppLiveStream(event);

    return ret;
  } catch (e) {
    // TODO Handle me later, maybe?
    console.error('Error :', e);
  }
};

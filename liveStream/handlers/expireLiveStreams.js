/* eslint-disable import/no-relative-packages */
import expireLiveStreams from '../lib/expireLiveStreams';

export default async () => {
  await expireLiveStreams();
};

/* eslint-disable import/no-relative-packages */
import { unqueueNotifications } from '../lib/queueNotifications';

export default async (event) => {
  try {
    const { appId, queueId } = event;
    await unqueueNotifications(appId, queueId);
    return true;
  } catch (e) {
    return false;
  }
};

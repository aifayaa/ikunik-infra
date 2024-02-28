/* eslint-disable import/no-relative-packages */
import { queueNotifications } from '../lib/notificationsQueue';

export default async (event) => {
  try {
    const { appId, notifyAt, type, only = null, data = {} } = event;
    const queueId = await queueNotifications(appId, notifyAt, type, data, {
      only,
    });
    return { queueId };
  } catch (e) {
    return {};
  }
};

import { queueNotifications } from '../lib/notificationsQueue';

export default async (event) => {
  try {
    const {
      appId,
      notifyAt,
      type,
      data = {},
    } = event;
    const queueId = await queueNotifications(appId, notifyAt, type, data);
    return ({ queueId });
  } catch (e) {
    return ({});
  }
};

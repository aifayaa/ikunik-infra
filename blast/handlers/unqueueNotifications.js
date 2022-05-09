import { unqueueNotifications } from '../lib/notificationsQueue';

export default async (event) => {
  try {
    const {
      appId,
      queueId,
    } = event;
    await unqueueNotifications(appId, queueId);
    return (true);
  } catch (e) {
    return (false);
  }
};

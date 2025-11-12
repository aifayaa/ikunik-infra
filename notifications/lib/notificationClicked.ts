import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { UserNotificationType } from './notificationsEntities';

const { COLL_NOTIFICATIONS } = mongoCollections;

export default async function notificationClicked(
  userId: string | null,
  appId: string,
  notificationId: string
) {
  const client = await MongoClient.connect();
  try {
    const notification = (await client
      .db()
      .collection(COLL_NOTIFICATIONS)
      .findOne({ _id: notificationId, appId })) as UserNotificationType | null;

    if (!notification) {
      return { ok: false };
    }

    if (notification.userId !== userId) {
    }

    return { ok: true };
  } finally {
    client.close();
  }
}

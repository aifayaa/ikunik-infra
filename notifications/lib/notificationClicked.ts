import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  DeviceNotificationType,
  NotificationType,
  UserNotificationType,
} from './notificationsEntities';

const { COLL_NOTIFICATIONS } = mongoCollections;

async function getNotification(
  userId: string | null,
  appId: string,
  deviceId: string,
  blastQueueId: string,
  notificationId: ObjectID | undefined,
  { client }: { client: any }
) {
  if (notificationId) {
    const notification = (await client
      .db()
      .collection(COLL_NOTIFICATIONS)
      .findOne({
        _id: notificationId,
        appId,
        blastQueueId,
      })) as NotificationType | null;

    return notification;
  } else if (userId) {
    const notification = (await client
      .db()
      .collection(COLL_NOTIFICATIONS)
      .findOne({
        appId,
        blastQueueId,
        target: 'user',
        userId,
      })) as UserNotificationType | null;

    return notification;
  } else {
    const notification = (await client
      .db()
      .collection(COLL_NOTIFICATIONS)
      .findOne({
        appId,
        blastQueueId,
        target: 'device',
        deviceId,
      })) as DeviceNotificationType | null;

    return notification;
  }
}

export default async function notificationClicked(
  userId: string | null,
  appId: string,
  deviceId: string,
  blastQueueId: string,
  notificationId: string | undefined
) {
  const client = await MongoClient.connect();
  try {
    const notification = await getNotification(
      userId,
      appId,
      deviceId,
      blastQueueId,
      notificationId ? ObjectID.createFromHexString(notificationId) : undefined,
      { client }
    );

    if (!notification) {
      return { notification: null };
    }

    let clicked = false;

    if (notification.target === 'user') {
      if (!notification.clicked) {
        clicked = true;
        notification.clicked = true;
        notification.clickedAt = new Date();
        notification.clickedOn.push(deviceId);

        await client
          .db()
          .collection(COLL_NOTIFICATIONS)
          .updateOne(
            { _id: notification._id },
            {
              $set: {
                clicked: notification.clicked,
                clickedAt: notification.clickedAt,
              },
              $addToSet: {
                clickedOn: deviceId,
              },
            }
          );
      }

      await client
        .db()
        .collection(COLL_NOTIFICATIONS)
        .updateOne(
          {
            appId,
            blastQueueId,
            target: 'device',
            deviceId,
            clicked: false,
          },
          {
            $set: {
              clicked: notification.clicked,
              clickedAt: notification.clickedAt,
            },
          }
        );
    } else if (notification.target === 'device') {
      if (!notification.clicked) {
        clicked = true;
        notification.clicked = true;
        notification.clickedAt = new Date();

        await client
          .db()
          .collection(COLL_NOTIFICATIONS)
          .updateOne(
            {
              _id: notification._id,
            },
            {
              $set: {
                clicked: notification.clicked,
                clickedAt: notification.clickedAt,
              },
            }
          );
      }

      await client
        .db()
        .collection(COLL_NOTIFICATIONS)
        .updateOne(
          {
            appId,
            blastQueueId,
            target: 'user',
            clicked: false,
          },
          {
            $set: {
              clicked: notification.clicked,
              clickedAt: notification.clickedAt,
            },
            $addToSet: {
              clickedOn: deviceId,
            },
          }
        );
    }

    return { notification, clicked };
  } finally {
    await client.close();
  }
}

import { useMongoDb } from '@libs/mongoUtils';
import {
  CommonNotificationType,
  DeviceNotificationType,
  NotificationType,
  UserNotificationType,
} from './notificationsEntities';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_NOTIFICATIONS } = mongoCollections;

type StoreSentNotificationExcludedFields =
  | 'clickedOn'
  | 'sentTo'
  | 'clicked'
  | 'clickedAt'
  | 'sentAt'
  | '_id';

type StoreSentNotificationParamsType = Omit<
  CommonNotificationType,
  StoreSentNotificationExcludedFields
> & {
  deviceId: string;
  userId: null | string;
};

export async function storeSentNotification({
  deviceId,
  userId,
  ...partialData
}: StoreSentNotificationParamsType) {
  await useMongoDb(async (db) => {
    const toInsertDevice: Omit<DeviceNotificationType, '_id'> = {
      ...partialData,
      target: 'device',
      clicked: false,
      clickedAt: null,
      sentAt: new Date(),
      userId,
      deviceId,
      success: partialData.aws.sent,
    };

    await db.collection(COLL_NOTIFICATIONS).insertOne(toInsertDevice);

    if (userId) {
      const toInsertUser: Omit<UserNotificationType, '_id'> = {
        ...partialData,
        clicked: false,
        clickedAt: null,
        sentAt: new Date(),
        target: 'user',
        clickedOn: [],
        sentTo: [userId],
        userId,
      };

      try {
        await db.collection(COLL_NOTIFICATIONS).insertOne(toInsertUser);
      } catch (e) {
        const existingItem = await db.collection(COLL_NOTIFICATIONS).findOne({
          appId: partialData.appId,
          blastQueueId: partialData.blastQueueId,
          target: 'user',
          userId,
        });

        if (existingItem) {
          await db.collection(COLL_NOTIFICATIONS).updateOne(
            { _id: existingItem._id },
            {
              $addToSet: { sentTo: deviceId },
            }
          );
        }
      }
    }
  });
}

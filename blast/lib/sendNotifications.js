/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendNotificationToAndHandleErrors } from './snsNotifications';

import NotificationSpecificsHandler from './notificationSpecificsHandlers/NotificationSpecificsHandler';

const { COLL_BLAST_NOTIFICATIONS_QUEUE, COLL_PUSH_NOTIFICATIONS, COLL_USERS } =
  mongoCollections;

const PROCESS_BATCH_SIZE = 200;

export const sendNotifications = async (appId, queueId) => {
  const client = await MongoClient.connect();
  try {
    const db = client.db();
    const queueCollection = db.collection(COLL_BLAST_NOTIFICATIONS_QUEUE);
    const $match = { appId, queueId: new ObjectID(queueId), root: false };
    const $rootMatch = { _id: new ObjectID(queueId), appId, root: true };
    const rootNotifQueue = await queueCollection.findOne($rootMatch);

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    let retry = false;
    let received = 0;

    if (!rootNotifQueue) {
      await queueCollection.deleteMany($match);
    } else {
      const pendingNotifs = await queueCollection
        .aggregate([
          { $match },
          { $limit: PROCESS_BATCH_SIZE },
          {
            $lookup: {
              from: COLL_PUSH_NOTIFICATIONS,
              localField: 'endpointId',
              foreignField: '_id',
              as: 'endpoint',
            },
          },
          {
            $lookup: {
              from: COLL_USERS,
              localField: 'userId',
              foreignField: '_id',
              as: 'user',
            },
          },
          {
            $project: {
              data: 1,
              endpoint: 1,
              user: 1,
              deviceId: 1,
            },
          },
        ])
        .toArray();

      received = pendingNotifs.length;
      const notifSpecificsHandler = new NotificationSpecificsHandler(
        client,
        appId,
        rootNotifQueue
      );
      const abort = !(await notifSpecificsHandler.init());

      if (abort) {
        retry = false;
      } else {
        retry = !!(pendingNotifs.length === PROCESS_BATCH_SIZE);
        const promises = pendingNotifs.map(async (pendingNotif) => {
          const {
            data = {},
            endpoint: [endpoint],
            user: [user],
            deviceId,
          } = pendingNotif;

          if (!endpoint) return;

          const { canNotify = true, data: notificationData = {} } =
            await notifSpecificsHandler.processOne({
              data,
              user,
              deviceId,
            });

          if (!canNotify) {
            skipped += 1;
            return;
          }

          await new Promise((resolve) => {
            sendNotificationToAndHandleErrors(
              {
                ...notificationData,
                crowdaaNotificationType: rootNotifQueue.type,
                endpoint,
              },
              { db }
            )
              .then((result) => {
                if (result.ok) {
                  sent += 1;
                } else {
                  failed += 1;
                  // eslint-disable-next-line no-console
                  console.error(
                    'Issue sending notification to',
                    endpoint,
                    ', result :',
                    result
                  );
                }
                resolve();
              })
              .catch((error) => {
                // eslint-disable-next-line no-console
                console.error('Error/crash sending notification :', error);
                failed += 1;
              });
          });
        });
        await Promise.all(promises);
      }

      await notifSpecificsHandler.batchDone(abort, retry);

      if (abort) {
        await queueCollection.deleteMany($match);
      } else if (pendingNotifs.length > 0) {
        await queueCollection.deleteMany({
          _id: { $in: pendingNotifs.map(({ _id }) => _id) },
        });
      }

      if (!retry) {
        await queueCollection.deleteOne($rootMatch);
      }
    }

    /**
     * @TODO Also check if there are very old / stale pending notifications
     *       to remove, even from other apps, maybe?
     */

    return {
      requested: PROCESS_BATCH_SIZE,
      received,
      sent,
      failed,
      skipped,
      retry,
    };
  } finally {
    await client.close();
  }
};

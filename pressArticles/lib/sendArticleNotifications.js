import MongoClient from '../../libs/mongoClient';
import { sendNotificationTo } from './snsNotifications';
import prepareNotif from './prepareNotifString';

const {
  COLL_PRESS_ARTICLES,
  COLL_PRESS_NOTIFICATIONS_QUEUE,
  COLL_PUSH_NOTIFICATIONS,
} = process.env;

const PROCESS_BATCH_SIZE = 200;

export const sendArticleNotifications = async (
  appId,
  articleId,
  draftId,
  notifyAt,
) => {
  const client = await MongoClient.connect();

  try {
    const $match = { appId, articleId, draftId, notifyAt: new Date(notifyAt) };
    const pendingNotifs = await client
      .db()
      .collection(COLL_PRESS_NOTIFICATIONS_QUEUE)
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
        { $unwind: '$endpoint' },
        { $project: { endpoint: 1 } },
      ])
      .toArray();

    const article = await client.db().collection(COLL_PRESS_ARTICLES).findOne({
      _id: articleId,
      draftId,
      isPublished: true,
      trashed: { $ne: true },
    });

    let sent = 0;
    let failed = 0;
    const retry = (pendingNotifs.length === PROCESS_BATCH_SIZE) && article;
    if (article) {
      const title = prepareNotif(article.title, 60, false);
      const message = prepareNotif(article.plainText);

      const promises = [];
      pendingNotifs.forEach(({ endpoint }) => {
        if (!endpoint) return;

        promises.push(
          new Promise((resolve) => {
            sendNotificationTo({
              title,
              message,
              endpoint,
              extraData: { articleId },
            }, (error/* , res */) => {
              if (!error) sent += 1;
              else failed += 1;
              resolve();
            });
          }),
        );
      });
      await Promise.all(promises);

      if (!retry) {
        await client.db().collection(COLL_PRESS_ARTICLES).updateOne(
          { _id: articleId },
          { $unset: { pendingNotificationAwsArnId: '' } },
        );
      }
    }

    if (!article) {
      await client
        .db()
        .collection(COLL_PRESS_NOTIFICATIONS_QUEUE)
        .deleteMany($match);
    } else if (pendingNotifs.length > 0) {
      await client
        .db()
        .collection(COLL_PRESS_NOTIFICATIONS_QUEUE)
        .deleteMany({
          _id: { $in: pendingNotifs.map(({ _id }) => (_id)) },
        });
    }

    /**
     * @TODO Also check if there are very old / stale pending notifications
     *       to remove, even from other apps, maybe?
     */

    return ({
      requested: PROCESS_BATCH_SIZE,
      received: pendingNotifs.length,
      sent,
      failed,
      retry,
    });
  } finally {
    client.close();
  }
};

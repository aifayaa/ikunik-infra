import MongoClient from '../../libs/mongoClient';
import { doSendNotifications } from './sendNotifications';

const {
  DB_NAME,
  COLL_PRESS_ARTICLES,
} = process.env;

export const broadcastArticleNotification = async (
  title,
  message,
  appId,
  articleId,
) => {
  const notificationResults = await doSendNotifications(
    title,
    message,
    appId,
    { articleId },
  );
  const client = await MongoClient.connect();
  await client
    .db(DB_NAME)
    .collection(COLL_PRESS_ARTICLES)
    .updateOne(
      {
        _id: articleId,
        appIds: appId,
      }, {
        $unset: {
          pendingNotificationAwsArnId: '',
        },
      },
    );
  return (notificationResults);
};

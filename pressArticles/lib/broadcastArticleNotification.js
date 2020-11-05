import MongoClient from '../../libs/mongoClient';
import { doSendNotifications } from './sendNotifications';
import prepareNotif from './prepareNotifString';

const {
  DB_NAME,
  COLL_PRESS_ARTICLES,
} = process.env;

export const broadcastArticleNotification = async (
  appId,
  articleId,
  draftId,
) => {
  const client = await MongoClient.connect();
  let notificationResults;

  try {
    const article = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .findOne({ _id: articleId });

    if (article) {
      const { title, plainText } = article;

      if (!article.trashed && article.isPublished && article.draftId === draftId) {
        notificationResults = await doSendNotifications(
          prepareNotif(title, 60, false),
          prepareNotif(plainText),
          appId,
          { articleId },
        );
      }

      await client
        .db(DB_NAME)
        .collection(COLL_PRESS_ARTICLES)
        .updateOne(
          {
            _id: articleId,
          }, {
            $unset: {
              pendingNotificationAwsArnId: '',
            },
          },
        );
    }
  } finally {
    client.close();
  }

  return (notificationResults);
};

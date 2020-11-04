import { broadcastArticleNotification } from '../lib/broadcastArticleNotification';

export default async ({ title, message, appId, articleId }) => {
  const notificationResults = await broadcastArticleNotification(
    title,
    message,
    appId,
    articleId,
  );
  return ({ success: true, results: notificationResults });
};

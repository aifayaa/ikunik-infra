import { broadcastArticleNotification } from '../lib/broadcastArticleNotification';

export default async ({ appId, articleId, draftId }) => {
  const notificationResults = await broadcastArticleNotification(
    appId,
    articleId,
    draftId,
  );
  return ({ success: true, results: notificationResults });
};

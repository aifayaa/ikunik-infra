/* eslint-disable import/no-relative-packages */
import { sendArticleNotifications } from '../lib/sendArticleNotifications';

export default async ({ appId, articleId, draftId, notifyAt }) => {
  const extraResponseData = await sendArticleNotifications(
    appId,
    articleId,
    draftId,
    notifyAt
  );
  return { success: true, ...extraResponseData };
};

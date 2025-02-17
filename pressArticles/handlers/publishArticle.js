/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import {
  queueArticleNotifications,
  cleanPendingArticleNotifications,
} from '../lib/notificationsQueue.ts';
import { publishArticle } from '../lib/publishArticle';
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    try {
      await checkFeaturePermsForApp(userId, appId, ['articlesEditor']);
    } catch (e) {
      await checkPermsForApp(userId, appId, ['admin']);
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }
    const {
      date,
      draftId,
      notificationContent = null,
      notificationDate = null,
      notificationTitle = null,
      sendNotifications = false,
      unpublicationDate = null,
    } = JSON.parse(event.body);
    if (!draftId || !date) {
      throw new Error('mal_formed_request');
    }
    const publicationDate = new Date(date);
    const articleId = event.pathParameters.id;
    const results = await publishArticle(
      userId,
      appId,
      articleId,
      draftId,
      publicationDate,
      unpublicationDate && new Date(unpublicationDate)
    );
    const requestResults = { results };
    await cleanPendingArticleNotifications(articleId);
    if (sendNotifications) {
      requestResults.notificationResults = await queueArticleNotifications(
        appId,
        articleId,
        draftId,
        notificationDate || publicationDate,
        notificationContent,
        notificationTitle
      );
    }
    return response({ code: 200, body: requestResults });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

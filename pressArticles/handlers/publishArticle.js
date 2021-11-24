import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import { queueArticleNotifications, cleanPendingArticleNotifications } from '../lib/notificationsQueue';
import { publishArticle } from '../lib/publishArticle';

const permKey = 'pressArticles_all';

export default async (event) => {
  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { appId } = event.requestContext.authorizer;
    if (!checkPerms(permKey, perms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }
    if (!event.body) {
      throw new Error('mal_formed_request');
    }
    const { draftId, date, sendNotifications = false } = JSON.parse(event.body);
    if (!draftId || !date) {
      throw new Error('mal_formed_request');
    }
    const publicationDate = new Date(date);
    const userId = event.requestContext.authorizer.principalId;
    const articleId = event.pathParameters.id;
    const results = await publishArticle(userId, appId, articleId, draftId, publicationDate);
    const requestResults = { results };
    await cleanPendingArticleNotifications(articleId);
    if (sendNotifications) {
      requestResults.notificationResults = await queueArticleNotifications(
        appId,
        articleId,
        draftId,
        publicationDate,
      );
    }
    return response({ code: 200, body: requestResults });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

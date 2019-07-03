import prepareNotif from '../lib/prepareNotifString';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import { doSendNotifications } from '../lib/sendNotifications';
import { getArticle } from '../lib/getArticle';
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
    const { draftId, sendNotifications = false } = JSON.parse(event.body);
    if (!draftId) {
      throw new Error('mal_formed_request');
    }
    const userId = event.requestContext.authorizer.principalId;
    const articleId = event.pathParameters.id;
    const results = await publishArticle(userId, appId, articleId, draftId);
    if (sendNotifications) {
      const article = await getArticle(articleId, appId, {});
      await doSendNotifications(
        article.title,
        prepareNotif(article.plainText),
        appId,
        { articleId },
      );
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

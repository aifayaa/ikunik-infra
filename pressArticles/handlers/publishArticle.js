import checkPerms from '../../libs/perms/checkPerms';
import doSendNotifications from '../lib/sendNotifications';
import getArticle from '../lib/getArticle';
import prepareNotif from '../lib/prepareNotifString';
import publishArticle from '../lib/publishArticle';
import response from '../../libs/httpResponses/response';

const permKey = 'pressArticles_all';

export default async (event, _context, callback) => {
  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { appId } = event.requestContext.authorizer;
    if (!checkPerms(permKey, perms)) {
      callback(null, response({ code: 403, message: 'access_forbidden' }));
      return;
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
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

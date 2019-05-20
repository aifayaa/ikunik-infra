import response from '../../libs/httpResponses/response';
import doSendNotifications from '../lib/sendNotifications';
import getArticle from '../lib/getArticle';
import prepareNotif from '../lib/prepareNotifString';
import publishArticle from '../lib/publishArticle';

export default async (event, _context, callback) => {
  try {
    const roles = JSON.parse(event.requestContext.authorizer.roles);
    const { appId } = event.requestContext.authorizer;
    if (!roles.includes('reporter')) {
      callback(null, response({ code: 403, message: 'access forbidden' }));
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

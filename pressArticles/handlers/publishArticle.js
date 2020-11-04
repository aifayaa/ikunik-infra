import prepareNotif from '../lib/prepareNotifString';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import { doSendNotifications } from '../lib/sendNotifications';
import { doSendDelayedNotifications } from '../lib/sendDelayedNotifications';
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
    const { draftId, date, sendNotifications = false } = JSON.parse(event.body);
    if (!draftId || !date) {
      throw new Error('mal_formed_request');
    }
    const publicationDate = new Date(date);
    const userId = event.requestContext.authorizer.principalId;
    const articleId = event.pathParameters.id;
    const results = await publishArticle(userId, appId, articleId, draftId, publicationDate);
    const requestResults = { results };
    if (sendNotifications) {
      const delay = ((publicationDate.getTime() - Date.now()) / 1000) | 0;
      let { title, plainText } = await getArticle(articleId, appId, {});
      title = prepareNotif(title, 60, false);
      plainText = prepareNotif(plainText);

      if (delay > 0) {
        requestResults.notificationResults = await doSendDelayedNotifications(
          title,
          plainText,
          appId,
          articleId,
          delay,
        );
      } else {
        requestResults.notificationResults = await doSendNotifications(
          title,
          plainText,
          appId,
          { articleId },
        );
      }
    }
    return response({ code: 200, body: requestResults });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

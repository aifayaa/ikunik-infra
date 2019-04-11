import buildResponse from '../../libs/httpResponses/response';
import doSendNotifications from '../lib/sendNotifications';
import getArticle from '../lib/getArticle';
import getClient from '../../api-keys/getClient';
import prepareNotif from '../lib/prepareNotifString';
import publishArticle from '../lib/publishArticle';

export default async (event, context, callback) => {
  try {
    const client = getClient(event.requestContext.identity.apiKey);
    const roles = JSON.parse(event.requestContext.authorizer.roles);
    if (!roles.includes('reporter')) {
      callback(null, buildResponse({ code: 403, message: 'access forbidden' }));
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
    const results = await publishArticle(userId, articleId, draftId);
    if (sendNotifications) {
      const article = await getArticle(articleId, {});
      await doSendNotifications(
        article.title,
        prepareNotif(article.plainText),
        client,
        { articleId },
      );
    }
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};

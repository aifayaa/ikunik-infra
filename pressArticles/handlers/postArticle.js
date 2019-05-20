import removeMd from 'remove-markdown';
import response from '../../libs/httpResponses/response';
import defaultSettings from '../lib/xmlParsing/settings/default.json';
import doSendNotifications from '../lib/sendNotifications';
import getArticle from '../lib/getArticle';
import getInfos from '../lib/xmlParsing/getInfos';
import mdToHtml from '../lib/mdParsing/mdToHtml';
import postArticle from '../lib/postArticle';
import publishArticle from '../lib/publishArticle';
import prepareNotif from '../lib/prepareNotifString';
import xmlToHtml from '../lib/xmlParsing/xmlToHtml';
import xmlToText from '../lib/xmlParsing/xmlToText';

export default async (event, context, callback) => {
  try {
    const roles = JSON.parse(event.requestContext.authorizer.roles);
    const { appId } = event.requestContext.authorizer;
    if (!roles.includes('reporter')) {
      callback(null, response({ code: 403, message: 'access forbidden' }));
      return;
    }
    if (!event.body) {
      throw new Error('missing_payload');
    }
    const {
      forceCategoryId,
      forcePictures,
      autoPublish,
      sendNotifications = false,
    } = event.queryStringParameters || {};

    let categoryId;
    let title;
    let summary;
    let html;
    let md;
    let xml;
    let pictures;
    let plainText;

    switch (event.headers['content-type']) {
      case 'application/json': {
        ({ categoryId, title, summary, md, pictures } = JSON.parse(event.body));
        plainText = removeMd(md);
        html = mdToHtml(md);
        break;
      }
      case 'application/xml': {
        xml = event.body;
        html = xmlToHtml(xml, defaultSettings);
        const infos = getInfos(xml, defaultSettings);
        title = infos.title || infos.name;
        summary = ' ';
        plainText = xmlToText(xml, defaultSettings);
        if (forcePictures) {
          try {
            pictures = JSON.parse(forcePictures);
          } catch (e) {
            pictures = [forcePictures];
          }
        }
        break;
      }
      default:
        throw new Error('unhandled_content_type');
    }

    categoryId = forceCategoryId || categoryId;
    if (!categoryId || !title || !summary || !html || !(md || xml) || !pictures) {
      throw new Error('mal_formed_request');
    }
    const userId = event.requestContext.authorizer.principalId;
    let results = await postArticle({
      userId,
      appId,
      categoryId,
      title,
      summary,
      html,
      md,
      xml,
      pictures,
      plainText,
    });
    if (autoPublish === 'true') {
      results = await publishArticle(
        userId,
        results.articleId,
        results.draftId,
        appId,
      );
      results.published = true;
      if (sendNotifications === 'true') {
        const article = await getArticle(results.articleId, {});
        await doSendNotifications(
          article.title,
          prepareNotif(article.plainText),
          appId,
          { articleId: results.articleId },
        );
        results.notificationSent = true;
      }
    }
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

import removeMd from 'remove-markdown';
import defaultSettings from '../lib/xmlParsing/settings/default.json';
import getInfos from '../lib/xmlParsing/getInfos';
import mdToHtml from '../lib/mdParsing/mdToHtml';
import prepareNotif from '../lib/prepareNotifString';
import response from '../../libs/httpResponses/response';
import xmlToHtml from '../lib/xmlParsing/xmlToHtml';
import xmlToText from '../lib/xmlParsing/xmlToText';
import { checkPerms } from '../../libs/perms/checkPerms';
import { doSendNotifications } from '../lib/sendNotifications';
import { getArticle } from '../lib/getArticle';
import { postArticle } from '../lib/postArticle';
import { publishArticle } from '../lib/publishArticle';
import checkActions from '../lib/checks/checkActions';
import articlePrices from '../articlePrices.json';

const permKey = 'pressArticles_all';

export default async (event) => {
  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { appId } = event.requestContext.authorizer;
    if (!checkPerms(permKey, perms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }
    if (!event.body) {
      throw new Error('missing_payload');
    }
    const {
      autoPublish,
      forceCategoryId,
      forcePictures,
      forceVideos,
      sendNotifications = false,
    } = event.queryStringParameters || {};

    let actions;
    let categoryId;
    let feedPicture;
    let html;
    let md;
    let pictures;
    let plainText;
    let productId;
    let summary;
    let title;
    let videos;
    let xml;

    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    switch (contentType) {
      case 'application/json': {
        ({
          actions,
          categoryId,
          feedPicture,
          md,
          pictures,
          summary,
          productId,
          title,
          videos,
        } = JSON.parse(event.body));
        plainText = removeMd(md);
        html = mdToHtml(md);
        break;
      }
      case 'application/xml': {
        xml = event.body;
        html = xmlToHtml(xml, defaultSettings);
        const infos = getInfos(xml, defaultSettings);
        title = infos.title || infos.name;
        productId = infos.productId;
        summary = ' ';
        plainText = xmlToText(xml, defaultSettings);
        if (forcePictures) {
          try {
            pictures = JSON.parse(forcePictures);
          } catch (e) {
            pictures = [forcePictures];
          }
        }
        if (forceVideos) {
          try {
            videos = JSON.parse(forceVideos);
          } catch (e) {
            videos = [forceVideos];
          }
        }
        break;
      }
      default:
        // eslint-disable-next-line no-console
        console.error(`unhandled_content_type, received type ${contentType}`);
        throw new Error('unhandled_content_type');
    }

    if (!actions) {
      actions = [];
    }

    categoryId = forceCategoryId || categoryId;
    if (
      !categoryId ||
      !title ||
      !summary ||
      !html ||
      !(md || xml) ||
      (!pictures && !videos)
    ) {
      throw new Error('mal_formed_request');
    }

    checkActions(actions);

    if (productId && !articlePrices[productId]) {
      throw new Error('mal_formed_request');
    }

    const userId = event.requestContext.authorizer.principalId;
    let results = await postArticle({
      actions,
      appId,
      categoryId,
      feedPicture,
      html,
      md,
      pictures,
      plainText,
      price: articlePrices[productId],
      productId,
      summary,
      title,
      userId,
      videos,
      xml,
    });

    if (autoPublish === 'true') {
      results = await publishArticle(
        userId,
        appId,
        results.articleId,
        results.draftId,
        new Date(),
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
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

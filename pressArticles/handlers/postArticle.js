import removeMd from 'remove-markdown';
import defaultSettings from '../lib/xmlParsing/settings/default.json';
import getInfos from '../lib/xmlParsing/getInfos';
import mdToHtml from '../lib/mdParsing/mdToHtml';
import response from '../../libs/httpResponses/response';
import xmlToHtml from '../lib/xmlParsing/xmlToHtml';
import xmlToText from '../lib/xmlParsing/xmlToText';
import { checkPerms } from '../../libs/perms/checkPerms';
import { queueArticleNotifications } from '../lib/notificationsQueue';
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
    let badges;
    let categoryId;
    let feedPicture;
    let hideFromFeed;
    let html;
    let likes;
    let md;
    let pictures;
    let plainText;
    let productId;
    let summary;
    let thumbnailDisplayMethod;
    let title;
    let videoPlayMode;
    let videos;
    let views;
    let xml;
    let pinned;

    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    switch (contentType) {
      case 'application/json': {
        ({
          actions,
          badges,
          categoryId,
          feedPicture,
          hideFromFeed,
          likes,
          md,
          pictures,
          productId,
          summary,
          thumbnailDisplayMethod,
          title,
          videoPlayMode,
          videos,
          views,
          pinned,
        } = JSON.parse(event.body));
        /**
         * The following regex is to fix catastrophic backtracking regex matching. See :
         * - https://github.com/stiang/remove-markdown/issues/52
         * - https://github.com/stiang/remove-markdown/issues/35
         * - https://stackoverflow.com/questions/2407870/javascript-regex-hangs-using-v8
         */
        plainText = removeMd(md.replace(/(\s{4})\s*/g, '$1'));
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

    /* Encore URI for internal PDF links */
    if (actions.length) {
      Object.keys(actions).forEach((k) => {
        if (actions[k].url.indexOf('/pdf/') === 0) {
          actions[k].url = `/pdf/${encodeURIComponent(actions[k].url.substring(5))}`;
        }
      });
    }

    if (productId && !articlePrices[productId]) {
      throw new Error('mal_formed_request');
    }

    likes = parseInt(likes, 10) || 0;
    if (likes < 0) likes = 0;
    views = parseInt(views, 10) || 0;
    if (views < 0) views = 0;

    const userId = event.requestContext.authorizer.principalId;
    let results = await postArticle({
      actions,
      appId,
      badges: badges || [],
      categoryId,
      feedPicture,
      hideFromFeed: !!hideFromFeed,
      html,
      likes,
      md,
      pictures,
      plainText,
      price: articlePrices[productId],
      productId,
      summary,
      thumbnailDisplayMethod,
      title,
      userId,
      videoPlayMode,
      videos,
      views,
      xml,
      pinned,
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
        await queueArticleNotifications(
          appId,
          results.articleId,
          results.draftId,
          userId,
          new Date(),
        );
        results.notificationSent = true;
      }
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

/* eslint-disable import/no-relative-packages */
import removeMd from 'remove-markdown';

import checkActions from '../lib/checks/checkActions';
import mdToHtml from '../lib/mdParsing/mdToHtml';
import response from '../../libs/httpResponses/response.ts';
import { publishArticle } from '../lib/publishArticle';
import { putArticle } from '../lib/putArticle';
import { queueArticleNotifications } from '../lib/notificationsQueue.ts';
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '../../libs/perms/checkPermsFor.ts';

import articlePrices from '../articlePrices.json';
import { getArticle } from '../lib/getArticle';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';

export default async (event) => {
  try {
    const {
      appId,
      principalId: userId,
      superAdmin,
    } = event.requestContext.authorizer;

    try {
      await checkFeaturePermsForApp(userId, appId, ['articlesEditor']);
    } catch (e) {
      await checkPermsForApp(userId, appId, ['admin']);
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }
    const { autoPublish, sendNotifications = false } =
      event.queryStringParameters || {};

    const bodyParsed = JSON.parse(event.body);
    const {
      articleId,
      authorName,
      badgesAllow,
      categoriesId,
      categoryId,
      displayOptions,
      eventEndDate,
      eventStartDate,
      feedPicture,
      hideFromFeed,
      isEvent,
      isPoll,
      isWebview,
      md = '',
      mediaCaptions,
      pdfs = [],
      pdfsOpenButton = '',
      pictures,
      pinned,
      productId,
      summary,
      thumbnailDisplayMethod,
      title,
      videoPlayMode,
      videos,
    } = bodyParsed;
    let { badges, actions, html = null } = bodyParsed;

    if (!actions) {
      actions = [];
    }

    if (
      !articleId ||
      (!categoryId && !categoriesId) ||
      !title ||
      !summary ||
      !md ||
      (!pictures && !videos)
    ) {
      throw new Error('mal_formed_request');
    }

    checkActions(actions);

    /* Encore URI for internal PDF links */
    if (actions.length) {
      Object.keys(actions).forEach((k) => {
        if (actions[k].url.indexOf('/pdf/') === 0) {
          actions[k].url =
            `/pdf/${encodeURIComponent(actions[k].url.substring(5))}`;
        }
      });
    }

    if (productId && !articlePrices[productId]) {
      throw new Error('mal_formed_request');
    }

    if (isWebview || isPoll) {
      html = md;
    } else if (typeof html !== 'string') {
      html = mdToHtml(md);
    }
    const plainText =
      isWebview || isPoll ? md : removeMd(md.replace(/(\s{4})\s*/g, '$1'));

    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'badges');
      if (!allowed) {
        badges = [];
      }
    }

    const results = await putArticle({
      actions,
      appId,
      articleId,
      authorName,
      badges: badges || [],
      badgesAllow: badgesAllow || 'any',
      categoriesId,
      categoryId,
      displayOptions: displayOptions || {},
      eventEndDate: new Date(eventEndDate || Date.now()),
      eventStartDate: new Date(eventStartDate || Date.now()),
      feedPicture,
      hideFromFeed: !!hideFromFeed,
      html,
      isEvent: !!isEvent,
      isPoll: !!isPoll,
      isWebview: !!isWebview,
      md,
      mediaCaptions,
      pdfs,
      pdfsOpenButton,
      pictures,
      pinned,
      /**
       * The following regex is to fix catastrophic backtracking regex matching. See :
       * - https://github.com/stiang/remove-markdown/issues/52
       * - https://github.com/stiang/remove-markdown/issues/35
       * - https://stackoverflow.com/questions/2407870/javascript-regex-hangs-using-v8
       */
      plainText,
      price: articlePrices[productId],
      productId,
      summary,
      thumbnailDisplayMethod,
      title,
      userId,
      videoPlayMode,
      videos,
    });

    if (autoPublish === 'true') {
      const article = await getArticle(articleId, appId, { isServer: true });
      await publishArticle(
        userId,
        appId,
        results.articleId,
        results.draftId,
        article.publicationDate || new Date(),
        article.unpublicationDate || null
      );
      results.published = true;
      if (sendNotifications === 'true') {
        await queueArticleNotifications(
          appId,
          results.articleId,
          results.draftId,
          new Date()
        );
        results.notificationSent = true;
      }
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

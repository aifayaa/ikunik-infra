import removeMd from 'remove-markdown';
import mdToHtml from '../lib/mdParsing/mdToHtml';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import { putArticle } from '../lib/putArticle';
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
      throw new Error('mal_formed_request');
    }
    const bodyParsed = JSON.parse(event.body);
    const {
      articleId,
      authorName,
      badges,
      badgesAllow,
      categoriesId,
      categoryId,
      displayOptions,
      eventEndDate,
      eventStartDate,
      feedPicture,
      hideFromFeed,
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
    let {
      actions,
    } = bodyParsed;

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
          actions[k].url = `/pdf/${encodeURIComponent(actions[k].url.substring(5))}`;
        }
      });
    }

    if (productId && !articlePrices[productId]) {
      throw new Error('mal_formed_request');
    }

    const html = isWebview ? md : mdToHtml(md);
    const plainText = isWebview ? md : removeMd(md.replace(/(\s{4})\s*/g, '$1'));

    const userId = event.requestContext.authorizer.principalId;
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
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

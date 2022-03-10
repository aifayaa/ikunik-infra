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
      badges,
      badgesAllow,
      categoryId,
      feedPicture,
      hideFromFeed,
      md = '',
      mediaCaptions,
      pictures,
      productId,
      summary,
      thumbnailDisplayMethod,
      title,
      videoPlayMode,
      videos,
      pinned,
    } = bodyParsed;
    let {
      actions,
    } = bodyParsed;

    if (!actions) {
      actions = [];
    }

    if (
      !articleId ||
      !categoryId ||
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

    const userId = event.requestContext.authorizer.principalId;
    const results = await putArticle({
      actions,
      appId,
      articleId,
      badges: badges || [],
      badgesAllow: badgesAllow || 'any',
      categoryId,
      feedPicture,
      hideFromFeed: !!hideFromFeed,
      html: mdToHtml(md),
      md,
      mediaCaptions,
      pictures,
      pinned,
      /**
       * The following regex is to fix catastrophic backtracking regex matching. See :
       * - https://github.com/stiang/remove-markdown/issues/52
       * - https://github.com/stiang/remove-markdown/issues/35
       * - https://stackoverflow.com/questions/2407870/javascript-regex-hangs-using-v8
       */
      plainText: removeMd(md.replace(/(\s{4})\s*/g, '$1')),
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

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
      categoryId,
      feedPicture,
      hideFromFeed,
      md,
      pictures,
      productId,
      summary,
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
      categoryId,
      feedPicture,
      hideFromFeed: !!hideFromFeed,
      html: mdToHtml(md),
      md,
      pictures,
      pinned,
      plainText: removeMd(md),
      price: articlePrices[productId],
      productId,
      summary,
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

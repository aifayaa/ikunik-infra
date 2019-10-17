import removeMd from 'remove-markdown';
import { URL } from 'url';
import mdToHtml from '../lib/mdParsing/mdToHtml';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import { putArticle } from '../lib/putArticle';

const stringIsAValidUrl = (s) => {
  try { return new URL(s); } catch (err) { return false; }
};

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
    const { actions, articleId, categoryId, title, summary, md, pictures } = JSON.parse(event.body);

    if (
      !articleId
      || !categoryId
      || !title
      || !summary
      || !md
      || !pictures
      || !actions
      || !Array.isArray(actions)
    ) {
      throw new Error('mal_formed_request');
    }

    actions.forEach((action) => {
      if (!action.title || !action.url) {
        throw new Error('mal_formed_request');
      }
      if (!stringIsAValidUrl(action.url)) {
        throw new Error('URL error');
      }
    });

    const userId = event.requestContext.authorizer.principalId;
    const results = await putArticle({
      actions,
      userId,
      appId,
      articleId,
      categoryId,
      title,
      summary,
      html: mdToHtml(md),
      md,
      pictures,
      plainText: removeMd(md),
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

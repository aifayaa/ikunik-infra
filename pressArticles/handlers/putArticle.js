import removeMd from 'remove-markdown';
import mdToHtml from '../lib/mdParsing/mdToHtml';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import { putArticle } from '../lib/putArticle';
import checkActions from '../lib/checks/checkActions';

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
    const { articleId, categoryId, title, summary, md, pictures, videos } = bodyParsed;
    let { actions } = bodyParsed;

    if (!actions) {
      actions = [];
    }

    if (
      !articleId
      || !categoryId
      || !title
      || !summary
      || !md
      || (!pictures && !videos)
    ) {
      throw new Error('mal_formed_request');
    }

    checkActions(actions);

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
      videos,
      plainText: removeMd(md),
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

import removeMd from 'remove-markdown';
import checkPerms from '../../libs/perms/checkPerms';
import mdToHtml from '../lib/mdParsing/mdToHtml';
import putArticle from '../lib/putArticle';
import response from '../../libs/httpResponses/response';

const permKey = 'pressArticles_all';

export default async (event, context, callback) => {
  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { appId } = event.requestContext.authorizer;
    if (!checkPerms(permKey, perms)) {
      callback(null, response({ code: 403, message: 'access_forbidden' }));
      return;
    }
    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const { articleId, categoryId, title, summary, md, pictures } = JSON.parse(event.body);
    if (!articleId || !categoryId || !title || !summary || !md || !pictures) {
      throw new Error('mal_formed_request');
    }
    const userId = event.requestContext.authorizer.principalId;
    const results = await putArticle({
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
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

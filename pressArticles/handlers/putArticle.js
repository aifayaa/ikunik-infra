import removeMd from 'remove-markdown';
import response from '../../libs/httpResponses/response';
import mdToHtml from '../lib/mdParsing/mdToHtml';
import putArticle from '../lib/putArticle';

export default async (event, context, callback) => {
  try {
    const roles = JSON.parse(event.requestContext.authorizer.roles);
    const { appId } = event.requestContext.authorizer;
    if (!roles.includes('reporter')) {
      callback(null, response({ code: 403, message: 'access forbidden' }));
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

import getArticles from '../lib/getArticles';
import response from '../../libs/httpResponses/response';
import checkPerms from '../../libs/perms/checkPerms';

const permKey = 'pressArticles_all';

export default async (event, context, callback) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { category, start, limit } = event.queryStringParameters || {};
    if (!checkPerms(permKey, perms)) {
      callback(null, response({ code: 403, message: 'access_forbidden' }));
      return;
    }
    const results = await getArticles(category, start, limit, appId, { onlyPublished: false });
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

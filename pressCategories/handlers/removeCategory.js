import checkPerms from '../../libs/perms/checkPerms';
import removeArticle from '../lib/removeCategory';
import response from '../../libs/httpResponses/response';

const permKey = 'pressCategories_all';

export default async (event, context, callback) => {
  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { appId } = event.requestContext.authorizer;
    if (!checkPerms(permKey, perms)) {
      callback(null, response({ code: 403, message: 'access_forbidden' }));
      return;
    }
    const categoryId = event.pathParameters.id;
    const results = await removeArticle(appId, categoryId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

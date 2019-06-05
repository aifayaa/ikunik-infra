import checkPerms from '../../libs/perms/checkPerms';
import postCategory from '../lib/postCategory';
import response from '../../libs/httpResponses/response';

const permKey = 'pressCategories_all';

export default async (event, context, callback) => {
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  const { appId } = event.requestContext.authorizer;
  if (!checkPerms(permKey, perms)) {
    callback(null, response({ code: 403, message: 'access_forbidden' }));
    return;
  }
  if (!event.body) {
    throw new Error('missing_payload');
  }
  try {
    const {
      name,
      pathName,
      color,
    } = JSON.parse(event.body);

    if (!name || !pathName || !color) {
      throw new Error('Missing arguments');
    }
    [
      name,
      pathName,
      color,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('Wrong argument type');
      }
    });

    const results = await postCategory(appId, name, pathName, color);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};


import { checkPerms } from '../../libs/perms/checkPerms';
import putCategory from '../lib/putCategory';
import response from '../../libs/httpResponses/response';

const permKey = 'pressCategories_all';

export default async (event) => {
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  const categoryId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  if (!checkPerms(permKey, perms)) {
    return response({ code: 403, message: 'access_forbidden' });
  }
  if (!event.body) {
    throw new Error('malformed_request');
  }
  try {
    const {
      name,
      pathName,
      color,
      picture,
    } = JSON.parse(event.body);

    if (!categoryId || !name || !pathName) {
      throw new Error('Missing arguments');
    }

    [
      categoryId,
      name,
      pathName,
      color,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('Wrong argument type');
      }
    });

    if (picture) {
      if (typeof picture !== 'object' || typeof picture.length === 'undefined') {
        throw new Error('Wrong argument type');
      }

      if (picture.length > 1) {
        throw new Error('Cannot upload more than one picture');
      }
    }

    if (color && !/^#(([0-9a-fA-F]{2}){3}|([0-9a-fA-F]){3})$/.test(color)) {
      throw new Error('Wrong color syntax, must be #xxxxxx');
    }

    const results = await putCategory(appId, categoryId, name, pathName, color, picture);

    if (results === false) {
      return response({ code: 404, message: 'category_not_found' });
    } else {
      return response({ code: 200, body: results });
    }
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};


import { checkPerms } from '../../libs/perms/checkPerms';
import postCategory from '../lib/postCategory';
import response from '../../libs/httpResponses/response';

const permKey = 'pressCategories_all';

export default async (event) => {
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  const { appId } = event.requestContext.authorizer;
  if (!checkPerms(permKey, perms)) {
    return response({ code: 403, message: 'access_forbidden' });
  }
  if (!event.body) {
    throw new Error('missing_payload');
  }
  try {
    const {
      name,
      pathName,
      color,
      picture,
      order,
    } = JSON.parse(event.body);

    if (!name) {
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

    if (order && (!Number.isInteger(order) || order < 1)) {
      throw new Error('Wrong order syntax, must be a positive integer');
    }

    const results = await postCategory(appId, name, pathName, color, picture, order);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

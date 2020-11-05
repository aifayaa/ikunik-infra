import errorMessage from '../../libs/httpResponses/errorMessage';
import putCategory from '../lib/putCategory';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'pressCategories_all';

export default async (event) => {
  const { id: categoryId } = event.pathParameters;
  const { appId, perms } = event.requestContext.authorizer;
  const permsParsed = JSON.parse(perms);

  try {
    if (!checkPerms(permKey, permsParsed)) {
      throw new Error('access_forbidden');
    }
    if (!event.body) {
      throw new Error('malformed_request');
    }

    const { name, pathName, color, picture, order, hidden } = JSON.parse(
      event.body,
    );

    if (!categoryId || !name) {
      throw new Error('missing_argument');
    }

    [categoryId, name, pathName, color].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('wrong_argument_type');
      }
    });

    if (typeof hidden !== 'boolean') {
      throw new Error('wrong_argument_type');
    }

    if (picture) {
      if (
        typeof picture !== 'object' ||
        typeof picture.length === 'undefined'
      ) {
        throw new Error('wrong_argument_type');
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

    const results = await putCategory(
      appId,
      categoryId,
      name,
      pathName,
      color,
      picture,
      order,
      hidden,
    );

    if (results === false) {
      return response({ code: 404, message: 'category_not_found' });
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};

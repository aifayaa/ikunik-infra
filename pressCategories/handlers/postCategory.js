import errorMessage from '../../libs/httpResponses/errorMessage';
import postCategory from '../lib/postCategory';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'pressCategories_all';

export default async (event) => {
  const { appId, perms } = event.requestContext.authorizer;
  const permsParsed = JSON.parse(perms);

  try {
    if (!checkPerms(permKey, permsParsed)) {
      throw new Error('access_forbidden');
    }
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { name, pathName, color, picture, order, hidden, action } = JSON.parse(
      event.body,
    );

    if (!name) {
      throw new Error('missing_argument');
    }

    [name, pathName, color, action].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('wrong_argument_type');
      }
    });

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

    if (typeof hidden !== 'boolean') {
      throw new Error('wrong_argument_type');
    }

    if (color && !/^#(([0-9a-fA-F]{2}){3}|([0-9a-fA-F]){3})$/.test(color)) {
      throw new Error('Wrong color syntax, must be #xxxxxx');
    }

    if (order && (!Number.isInteger(order) || order < 1)) {
      throw new Error('Wrong order syntax, must be a positive integer');
    }

    if (action && !/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/.test(action)) {
      throw new Error('Wrong url syntax, must be http://www.page.com');
    }

    const results = await postCategory(
      appId,
      name,
      pathName,
      color,
      picture,
      order,
      hidden,
      action,
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};

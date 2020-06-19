import errorMessage from '../../libs/httpResponses/errorMessage';
import { postPurchasableProduct } from '../lib/postPurchasableProduct';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'purchasableProducts_post';
const availableTypes = ['subscription', 'direct'];

export default async (event) => {
  const { appId, perms: authorizerPerms } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;

  try {
    const permissions = JSON.parse(authorizerPerms);
    if (!checkPerms(permKey, permissions)) {
      throw new Error('access_forbidden');
    }

    if (!event.body) {
      throw new Error('missing_payload');
    }

    const bodyParsed = JSON.parse(event.body);
    const {
      _id,
      content,
      options = {},
      perms = {},
      price,
      type,
    } = bodyParsed;

    if (
      !content ||
      !perms ||
      !price ||
      !type ||
      typeof perms.all === 'undefined' ||
      typeof perms.read === 'undefined' ||
      typeof perms.write === 'undefined'
    ) {
      throw new Error('missing_argument');
    }

    [
      _id,
      price,
      type,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('wrong_argument_type');
      }
    });

    [
      perms.all,
      perms.read,
      perms.write,
    ].forEach((item) => {
      if (item && typeof item !== 'boolean') {
        throw new Error('wrong_argument_type');
      }
    });

    if (typeof content !== 'object' || typeof content.length === 'undefined') {
      throw new Error('wrong_argument_type');
    }

    content.forEach((contentItem) => {
      if (!contentItem.id || !contentItem.collection) {
        throw new Error('missing_argument');
      }
      if (typeof contentItem.id !== 'string' || typeof contentItem.collection !== 'string') {
        throw new Error('wrong_argument_type');
      }
    });

    if (typeof options.expireIn !== 'undefined') {
      if (typeof options.expireIn === 'string') {
        options.expireIn = new Date(options.expireIn);
        if (options.expireIn.toString() === 'Invalid Date') {
          throw new Error('wrong_argument_value');
        }
      } else if (typeof options.expireIn === 'boolean' && options.expireIn) {
        throw new Error('wrong_argument_value');
      } else {
        throw new Error('wrong_argument_type');
      }
    }

    if (!(availableTypes.indexOf(type) + 1)) {
      throw new Error('wrong_argument_value');
    }

    const results = await postPurchasableProduct(
      appId,
      userId,
      {
        _id,
        content,
        options,
        perms,
        price,
        type,
      },
    );

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};

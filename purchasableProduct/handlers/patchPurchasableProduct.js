import errorMessage from '../../libs/httpResponses/errorMessage';
import { patchPurchasableProduct } from '../lib/patchPurchasableProduct';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'purchasableProducts_patch';
const availableTypes = ['subscription', 'direct'];

export default async (event) => {
  const { appId, perms: authorizerPerms } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;
  const productId = event.pathParameters.id;

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

    [
      _id,
      appId,
      price,
      type,
      userId,
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

    if (typeof content !== 'undefined') {
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
    }

    if (typeof options.expiresIn !== 'undefined') {
      if (typeof options.expiresIn === 'string') {
        options.expiresIn = new Date(options.expiresIn);
        if (options.expiresIn.toString() === 'Invalid Date') {
          throw new Error('wrong_argument_value');
        }
      } else if (typeof options.expiresIn === 'boolean' && options.expiresIn) {
        throw new Error('wrong_argument_value');
      } else {
        throw new Error('wrong_argument_type');
      }
    }

    if (type && !(availableTypes.indexOf(type) + 1)) {
      throw new Error('wrong_argument_value');
    }

    const results = await patchPurchasableProduct(
      appId,
      userId,
      productId,
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

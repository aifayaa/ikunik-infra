import errorMessage from '../../libs/httpResponses/errorMessage';
import patchPurchasableProduct from '../lib/patchPurchasableProduct';
import response from '../../libs/httpResponses/response';

const availableTypes = ['subscription', 'direct'];

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;
  const productId = event.pathParameters.id;

  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const bodyParsed = JSON.parse(event.body);
    const {
      _id,
      content,
      options,
      perms,
      price,
      type,
    } = bodyParsed;

    if (price && typeof price !== 'number') {
      throw new Error('wrong_argument_type');
    }

    [
      _id,
      appId,
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

    if (options.expireIn) {
      if (typeof options.expireIn === 'string' && Date(options.expireIn) === Date()) {
        throw new Error('wrong_argument_value');
      } else if (typeof options.expireIn === 'boolean' && options.expireIn) {
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

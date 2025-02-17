/* eslint-disable import/no-relative-packages */
import { patchPurchasableProduct } from '../lib/patchPurchasableProduct';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '../../libs/perms/checkPermsFor.ts';

const availableTypes = ['subscription', 'direct'];

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const productId = event.pathParameters.id;

  try {
    try {
      await checkFeaturePermsForApp(userId, appId, ['articlesEditor']);
    } catch (e) {
      await checkPermsForApp(userId, appId, ['admin']);
    }

    if (!event.body) {
      throw new Error('missing_payload');
    }

    const bodyParsed = JSON.parse(event.body);
    const { _id, contents, options = {}, price, type } = bodyParsed;

    [_id, appId, price, type, userId].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('wrong_argument_type');
      }
    });

    if (typeof contents !== 'undefined') {
      if (
        typeof contents !== 'object' ||
        typeof contents.length === 'undefined'
      ) {
        throw new Error('wrong_argument_type');
      }

      contents.forEach((contentItem) => {
        if (
          !contentItem.id ||
          !contentItem.collection ||
          !contentItem.permissions
        ) {
          throw new Error('missing_argument');
        }

        if (
          typeof contentItem.id !== 'string' ||
          typeof contentItem.collection !== 'string' ||
          typeof contentItem.permissions !== 'object' ||
          typeof contentItem.permissions.length !== 'undefined'
        ) {
          throw new Error('wrong_argument_type');
        }

        Object.keys(contentItem.permissions).forEach((key) => {
          if (typeof contentItem.permissions[key] !== 'boolean') {
            throw new Error('wrong_argument_type');
          }
        });
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

    const results = await patchPurchasableProduct(appId, userId, productId, {
      _id,
      contents,
      options,
      price,
      type,
    });

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};

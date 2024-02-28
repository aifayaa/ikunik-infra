/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import getArticlesFrom from '../lib/getArticlesFrom';

const permKey = 'pressArticles_all';

export default async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const {
      category = null,
      start,
      limit,
      from,
      ...extras
    } = event.queryStringParameters || {};
    if (!checkPerms(permKey, perms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }
    const boolExtras = Object.keys(extras).reduce((acc, key) => {
      acc[key] = !!`${extras[key]}`.match(/true/i);
      return acc;
    }, {});
    const results = await getArticlesFrom(
      category,
      start,
      limit,
      new Date(from),
      appId,
      boolExtras
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

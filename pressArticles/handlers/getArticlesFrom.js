/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import getArticlesFrom from '../lib/getArticlesFrom';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const {
      category = null,
      start,
      limit,
      from,
      sortBy = 'publicationDate',
      ...extras
    } = event.queryStringParameters || {};

    await checkPermsForApp(userId, appId, ['admin']);

    const boolExtras = Object.keys(extras).reduce((acc, key) => {
      acc[key] = !!`${extras[key]}`.match(/true/i);
      return acc;
    }, {});
    const results = await getArticlesFrom(
      category,
      start,
      limit,
      new Date(from),
      sortBy,
      appId,
      boolExtras
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

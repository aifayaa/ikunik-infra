/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import search2 from '../lib/search2';

/**
 * This search is using regex search.
 * It is slower but can be more accurate for some clients/apps.
 * It can match partial words for example whereas mongodb text index cannot.
 */
export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const { text, skip, limit } = event.queryStringParameters || {};
    const results = await search2(text, appId, {
      skip: parseInt(skip, 10) || undefined,
      limit: parseInt(limit, 10) || undefined,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

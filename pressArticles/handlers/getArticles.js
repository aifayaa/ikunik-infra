import response from '../../libs/httpResponses/response';
import { getArticles } from '../lib/getArticles';

export default async (event) => {
  try {
    const { resource } = event;
    const { appId, principalId: userId } = event.requestContext.authorizer;
    const {
      category,
      start,
      limit,
      reversedSort,
      noDateFilter,
    } = event.queryStringParameters || {};

    const checkBadges = !!resource.match(/^\/press\/articles\/v2/);

    const results = await getArticles(
      category,
      start,
      limit,
      appId,
      {
        getPictures: true,
        reversedSort: (reversedSort === 'true'),
        noDateFilter: (noDateFilter === 'true'),
        userId,
        checkBadges,
      },
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

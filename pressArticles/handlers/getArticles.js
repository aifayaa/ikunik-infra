import response from '../../libs/httpResponses/response';
import { getArticles } from '../lib/getArticles';

export default async (event) => {
  try {
    const { resource = '/press/articles/v2' } = event;
    const { appId, principalId: userId } = event.requestContext.authorizer;
    const {
      category,
      limit,
      noDateFilter,
      reversedFlow,
      start,
      startDate,
    } = event.queryStringParameters || {};

    const checkBadges = !!resource.match(/^\/press\/articles\/v2/);

    const results = await getArticles(
      category,
      start,
      limit,
      appId,
      {
        checkBadges,
        getPictures: true,
        noDateFilter: (noDateFilter === 'true'),
        reversedFlow: (reversedFlow === 'true'),
        startDate,
        userId,
      },
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

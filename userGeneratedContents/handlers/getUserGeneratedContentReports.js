import getUserGeneratedContentReports from '../lib/getUserGeneratedContentReports';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKeys = [
  'userGeneratedContents_all',
  'userGeneratedContents_moderate',
];

export default async (event) => {
  const userGeneratedContentId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;

  const {
    limit,
    start,
    countOnly = false,
  } = event.queryStringParameters || {};

  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const isModerator = checkPerms(permKeys, perms);

    if (!isModerator) {
      const error = new Error('Unauthorized: not enough right level');
      error.code = 401;
      throw error;
    }
    if (
      /* eslint-disable eqeqeq */
      (start && parseInt(start, 10) != start) ||
      (limit && parseInt(limit, 10) != limit)
      /* eslint-enable eqeqeq */
    ) {
      throw new Error('wrong_argument_type');
    }

    const { items, totalCount } = await getUserGeneratedContentReports(
      appId,
      userGeneratedContentId,
      {
        start,
        limit,
        countOnly,
      },
    );
    return response({
      code: 200,
      body: countOnly ? { totalCount } : { totalCount, items },
    });
  } catch (e) {
    return response({ code: e.code || 500, message: e.message });
  }
};

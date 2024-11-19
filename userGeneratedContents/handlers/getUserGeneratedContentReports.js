/* eslint-disable import/no-relative-packages */
import getUserGeneratedContentReports from '../lib/getUserGeneratedContentReports';
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const userGeneratedContentId = event.pathParameters.id;
  const { appId, principalId: userId } = event.requestContext.authorizer;

  const { limit, start } = event.queryStringParameters || {};

  let { countOnly = false } = event.queryStringParameters || {};

  try {
    await checkPermsForApp(userId, appId, ['moderator']);

    if (
      /* eslint-disable eqeqeq */
      (start && parseInt(start, 10) != start) ||
      (limit && parseInt(limit, 10) != limit)
      /* eslint-enable eqeqeq */
    ) {
      throw new Error('wrong_argument_type');
    }

    if (typeof countOnly !== 'boolean') {
      const lowerCaseCountOnly = countOnly.toLowerCase();
      if (['true', 'false'].indexOf(lowerCaseCountOnly) + 1) {
        countOnly = countOnly.toLowerCase() === 'true';
      } else {
        throw new Error('wrong_argument_type');
      }
    }

    const { items, totalCount } = await getUserGeneratedContentReports(
      appId,
      userGeneratedContentId,
      {
        start,
        limit,
        countOnly,
      }
    );
    return response({
      code: 200,
      body: countOnly ? { totalCount } : { totalCount, items },
    });
  } catch (e) {
    return response(errorMessage(e));
  }
};

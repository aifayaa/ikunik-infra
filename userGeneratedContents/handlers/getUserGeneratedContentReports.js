/* eslint-disable import/no-relative-packages */
import getUserGeneratedContentReports from '../lib/getUserGeneratedContentReports';
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKeys = [
  'userGeneratedContents_all',
  'userGeneratedContents_moderate',
];

export default async (event) => {
  const userGeneratedContentId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;

  const { limit, start } = event.queryStringParameters || {};

  let { countOnly = false } = event.queryStringParameters || {};

  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const isModerator = checkPerms(permKeys, perms);

    if (!isModerator) {
      throw new Error('insufficient_user_rights');
    }

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
    return response(errorMessage({ message: e.message }));
  }
};

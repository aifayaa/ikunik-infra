import getChildrenUserGeneratedContents from '../lib/getChildrenUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import pathToCollection from '../../libs/collections/pathToCollection';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKeys = [
  'userGeneratedContents_all',
  'userGeneratedContents_moderate',
];

export default async (event) => {
  const rootParentId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  const { start, limit } = event.queryStringParameters || {};
  let { all: fetchAll } = event.queryStringParameters || {};

  /* Get collection from resource path */
  const rootParentCollection = pathToCollection(event.requestContext.resourcePath);

  try {
    if (!rootParentId || !rootParentCollection) {
      throw new Error('Missing arguments');
    }

    fetchAll = (`${fetchAll}` === 'true');

    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const isModerator = checkPerms(permKeys, perms);
    if (!isModerator) {
      fetchAll = false;
    }

    [
      rootParentId,
      rootParentCollection,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('Wrong argument type');
      }
    });

    // eslint-disable-next-line eqeqeq
    if (start && parseInt(start, 10) != start) {
      throw new Error('Wrong argument type');
    }

    // eslint-disable-next-line eqeqeq
    if (limit && parseInt(limit, 10) != limit) {
      throw new Error('Wrong argument type');
    }

    const results = await getChildrenUserGeneratedContents(
      appId,
      rootParentId,
      rootParentCollection,
      start,
      limit,
      fetchAll,
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

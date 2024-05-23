/* eslint-disable import/no-relative-packages */
import getChildrenUserGeneratedContents from '../lib/getChildrenUserGeneratedContents';
import response from '../../libs/httpResponses/response.ts';
import pathToCollection from '../../libs/collections/pathToCollection';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const parentId = event.pathParameters.id;
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const {
    start,
    limit,
    children = 'false',
  } = event.queryStringParameters || {};
  let { all: fetchAll } = event.queryStringParameters || {};

  /* Get collection from resource path */
  const parentCollection = pathToCollection(event.requestContext.resourcePath);

  try {
    if (!parentId || !parentCollection) {
      throw new Error('Missing arguments');
    }

    fetchAll = `${fetchAll}` === 'true';

    const isModerator = await checkPermsForApp(userId, appId, ['moderator'], {
      dontThrow: true,
    });

    if (!isModerator) {
      fetchAll = false;
    }

    [parentId, parentCollection].forEach((item) => {
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
      parentId,
      parentCollection,
      start,
      limit,
      children === 'true',
      fetchAll
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

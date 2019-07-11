import getMultipleUserGeneratedContents from '../lib/getMultipleUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import pathToCollection from '../../libs/collections/pathToCollection';

export default async (event, context, callback) => {
  const parentId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  const { start, limit } = event.queryStringParameters || {};

  /* Get collection from resource path */
  const parentCollection = pathToCollection(event.requestContext.resourcePath);

  try {
    if (!parentId || !parentCollection) {
      throw new Error('Missing arguments');
    }

    [
      parentId,
      parentCollection,
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

    const results = await getMultipleUserGeneratedContents(
      appId,
      parentId,
      parentCollection,
      start,
      limit,
    );
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

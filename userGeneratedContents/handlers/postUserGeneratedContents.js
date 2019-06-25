import postUserGeneratedContents from '../lib/postUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import pathToCollection from '../../libs/collections/pathToCollection';

export default async (event, context, callback) => {
  const { appId } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;
  /* Get collection from resource path */
  const parentCollection = pathToCollection(event.requestContext.resourcePath);

  if (!event.body) {
    throw new Error('missing_payload');
  }
  try {
    const bodyParsed = JSON.parse(event.body);
    const {
      parentId,
      type,
      data,
    } = bodyParsed;

    /* If unspecified, use the same as parent for the rootParent */
    const rootParentId = bodyParsed.rootParentId || parentId;
    const rootParentCollection = bodyParsed.rootParentCollection || parentCollection;

    if (!parentId || !parentCollection) {
      throw new Error('Missing arguments');
    }

    [
      appId,
      parentId,
      parentCollection,
      rootParentId,
      rootParentCollection,
      userId,
      type,
      data,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('Wrong argument type');
      }
    });

    const results = await postUserGeneratedContents(
      appId,
      parentId,
      parentCollection,
      rootParentId || parentId,
      rootParentCollection || parentCollection,
      userId,
      type,
      data,
    );
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};


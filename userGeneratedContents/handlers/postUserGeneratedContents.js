import checkPerms from '../../libs/perms/checkPerms';
import postUserGeneratedContents from '../lib/postUserGeneratedContents';
import response from '../../libs/httpResponses/response';

const permKey = 'userGeneratedContents_all';

export default async (event, context, callback) => {
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  const { appId } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;
  const pathSplitted = event.resource.split('/');

  /* Check for permissions */
  if (!checkPerms(permKey, perms)) {
    callback(null, response({ code: 403, message: 'access_forbidden' }));
    return;
  }
  if (!event.body) {
    throw new Error('missing_payload');
  }
  try {
    const bodyParsed = JSON.parse(event.body);
    const {
      parentId,
      type,
    } = bodyParsed;

    /* Get collection from path */
    const parentCollection = pathSplitted[1];

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
    );
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};


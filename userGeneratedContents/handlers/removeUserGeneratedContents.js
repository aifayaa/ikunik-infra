import checkPerms from '../../libs/perms/checkPerms';
import removeUserGeneratedContents from '../lib/removeUserGeneratedContents';
import response from '../../libs/httpResponses/response';

const permKey = 'userGeneratedContents_all';

export default async (event, context, callback) => {
  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { appId } = event.requestContext.authorizer;
    const userId = event.requestContext.authorizer.principalId;
    const userGeneratedContentsId = event.pathParameters.id;
    if (!checkPerms(permKey, perms)) {
      callback(null, response({ code: 403, message: 'access_forbidden' }));
      return;
    }
    const havePermission = await removeUserGeneratedContents.checkPerm(
      appId,
      userId,
      userGeneratedContentsId,
    );
    if (!havePermission) {
      callback(null, response({ code: 403, message: 'unauthorized' }));
      return;
    }
    const results = await removeUserGeneratedContents.process(
      appId,
      userId,
      userGeneratedContentsId,
    );
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

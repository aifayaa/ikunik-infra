import removeUserGeneratedContents from '../lib/removeUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import checkOwner from '../../libs/perms/checkOwner';

const {
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

export default async (event, context, callback) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const userId = event.requestContext.authorizer.principalId;
    const userGeneratedContentsId = event.pathParameters.id;

    const checkResults = await checkOwner(appId, userGeneratedContentsId, COLL_USER_GENERATED_CONTENTS, 'userId', userId);

    if (checkResults !== true) {
      callback(null, checkResults);
      return;
    }

    const results = await removeUserGeneratedContents(appId, userId, userGeneratedContentsId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

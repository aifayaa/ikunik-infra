import removeUserGeneratedContents from '../lib/removeUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import checkOwner from '../../libs/perms/checkOwner';

const {
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

export default async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const userId = event.requestContext.authorizer.principalId;
    const userGeneratedContentsId = event.pathParameters.id;

    const checkResults = await checkOwner(appId, userGeneratedContentsId, COLL_USER_GENERATED_CONTENTS, 'userId', userId);

    if (checkResults !== true) {
      return response({ code: 403, message: checkResults });
    }

    const results = await removeUserGeneratedContents(appId, userId, userGeneratedContentsId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

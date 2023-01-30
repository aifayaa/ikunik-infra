import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { checkPerms } from '../../libs/perms/checkPerms';
import { generatedContentStatus } from '../lib/generatedContentStatus';

const permKey = 'pressArticles_all';

export default async (event) => {
  try {
    const { id: queryId } = event.pathParameters;
    const { appId, principalId: userId } = event.requestContext.authorizer;
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    if (!checkPerms(permKey, perms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }

    const statusObj = await generatedContentStatus(queryId, { appId, userId });
    return response({
      code: 200,
      body: statusObj,
    });
  } catch (e) {
    return response(errorMessage(e));
  }
};

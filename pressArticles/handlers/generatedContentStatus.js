/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { generatedContentStatus } from '../lib/generatedContentStatus';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { id: queryId } = event.pathParameters;
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
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

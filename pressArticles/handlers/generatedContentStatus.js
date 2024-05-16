/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import { generatedContentStatus } from '../lib/generatedContentStatus';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { id: queryId } = event.pathParameters;
    const { appId, principalId: userId } = event.requestContext.authorizer;

    await checkPermsForApp(userId, appId, ['admin']);

    const statusObj = await generatedContentStatus(queryId, { appId, userId });
    return response({
      code: 200,
      body: statusObj,
    });
  } catch (exception) {
    return handleException(exception);
  }
};

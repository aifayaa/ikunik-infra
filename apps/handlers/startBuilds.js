/* eslint-disable import/no-relative-packages */
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import startBuilds from '../lib/startBuilds';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: appId } = event.pathParameters;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const { platforms } = event.body ? JSON.parse(event.body) : {};

    const startBuildResult = await startBuilds(appId, { platforms });

    return response({
      code: 200,
      body: formatResponseBody({
        data: startBuildResult,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

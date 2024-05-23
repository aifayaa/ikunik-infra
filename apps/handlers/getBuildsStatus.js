/* eslint-disable import/no-relative-packages */
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import getBuildsStatus from '../lib/getBuildsStatus';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: appId, platform } = event.pathParameters;
  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const params = event.queryStringParameters || {};

    const boolParams = Object.keys(params).reduce((acc, key) => {
      acc[key] = params[key] === 'true';
      return acc;
    }, {});

    const buildsStatus = await getBuildsStatus(appId, platform, boolParams);

    return response({
      code: 200,
      body: formatResponseBody({
        data: buildsStatus,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};

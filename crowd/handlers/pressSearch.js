/* eslint-disable import/no-relative-packages */
import buildPressPipeline from '../lib/pipelines/pressPipeline';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import searchPress from '../lib/pressSearch';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { queryStringParameters = {} } = event;
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    queryStringParameters.filterUserInfo = true;
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const pipeline = buildPressPipeline(userId, appId, queryStringParameters);
    const results = await searchPress(pipeline, appId, queryStringParameters);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};

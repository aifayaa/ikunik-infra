/* eslint-disable import/no-relative-packages */
import buildCrowdPipeline from '../lib/pipelines/crowdPipeline';
import buildPressPipeline from '../lib/pipelines/pressPipeline';
import search from '../lib/search';
import pressSearch from '../lib/pressSearch';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

// To avoid getting a warning with lint
const jsConsole = console;

export default async (event) => {
  try {
    event.queryStringParameters = event.queryStringParameters || {};
    const { appId, principalId: userId } = event.requestContext.authorizer;
    Object.assign(event.queryStringParameters, { filterUserInfo: true });

    if (
      event.queryStringParameters.type &&
      event.queryStringParameters.type === 'press'
    ) {
      const allowed = await checkPermsForApp(userId, appId, 'admin');
      if (!allowed) {
        throw new Error('access_forbidden');
      }

      const pipeline = buildPressPipeline(
        userId,
        appId,
        event.queryStringParameters
      );
      const results = await pressSearch(
        pipeline,
        appId,
        event.queryStringParameters
      );
      return response({ code: 200, body: results });
    }

    const pipeline = buildCrowdPipeline(
      userId,
      appId,
      event.queryStringParameters
    );
    const results = await search(pipeline, event.queryStringParameters);
    return response({ code: 200, body: results });
  } catch (e) {
    jsConsole.error(e);
    return response({ code: 500, message: e.message });
  }
};

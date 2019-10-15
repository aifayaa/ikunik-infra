import winston from 'winston';
import buildCrowdPipeline from '../lib/pipelines/crowdPipeline';
import buildPressPipeline from '../lib/pipelines/pressPipeline';
import search from '../lib/search';
import searchPress from '../lib/searchPress';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

export default async (event) => {
  try {
    event.queryStringParameters = event.queryStringParameters || {};
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;

    if (event.queryStringParameters.type && event.queryStringParameters.type === 'press') {
      const permKey = 'search_press';
      const perms = JSON.parse(event.requestContext.authorizer.perms);
      if (!checkPerms(permKey, perms)) {
        return response({ code: 403, message: 'access_forbidden' });
      }

      const pipeline = buildPressPipeline(userId, appId, event.queryStringParameters);
      const results = await searchPress(pipeline, event.queryStringParameters);
      return response({ code: 200, body: results });
    }

    const pipeline = buildCrowdPipeline(userId, appId, event.queryStringParameters);
    Object.assign(event.queryStringParameters, { filterUserInfo: true });
    const results = await search(pipeline, event.queryStringParameters);
    return response({ code: 200, body: results });
  } catch (e) {
    winston.error(e);
    return response({ code: 500, message: e.message });
  }
};

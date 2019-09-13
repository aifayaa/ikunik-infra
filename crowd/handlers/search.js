import winston from 'winston';
import buildPipeline from '../lib/buildPipeline';
import search from '../lib/search';
import searchPress from '../lib/searchPress';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    event.queryStringParameters = event.queryStringParameters || {};
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    if (event.queryStringParameters.type && event.queryStringParameters.type === 'press') {
      const results = await searchPress(appId, userId, event.queryStringParameters);
      return response({ code: 200, body: results });
    }

    const pipeline = buildPipeline(userId, appId, event.queryStringParameters);
    Object.assign(event.queryStringParameters, { filterUserInfo: true });
    const results = await search(pipeline, event.queryStringParameters);
    return response({ code: 200, body: results });
  } catch (e) {
    winston.error(e);
    return response({ code: 500, message: e.message });
  }
};

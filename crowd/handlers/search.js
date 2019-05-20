import winston from 'winston';
import buildPipeline from '../lib/buildPipeline';
import search from '../lib/search';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  try {
    event.queryStringParameters = event.queryStringParameters || {};
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const pipeline = buildPipeline(userId, appId, event.queryStringParameters);
    Object.assign(event.queryStringParameters, { filterUserInfo: true });
    const results = await search(pipeline, event.queryStringParameters);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    winston.error(e);
    callback(null, response({ code: 500, message: e.message }));
  }
};

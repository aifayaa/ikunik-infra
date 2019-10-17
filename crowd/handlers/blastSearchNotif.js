import queue from 'async/queue';
import flatten from 'lodash/flatten';
import Lambda from 'aws-sdk/clients/lambda';
import winston from 'winston';
import buildPipeline from '../lib/pipelines/crowdPipeline';
import search from '../lib/search';
import response from '../../libs/httpResponses/response';

const {
  REGION,
  STAGE,
} = process.env;

const lambda = new Lambda({
  region: REGION,
});

const MAXIMUM_DATA_FETCHED_PER_PAGE = 500;

export default async (event, context, callback) => {
  try {
    /* Some base variables */
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const { artistName, message } = JSON.parse(event.body);
    Object.assign(event.queryStringParameters, { hasNotification: true });
    const pipeline = buildPipeline(userId, appId, event.queryStringParameters || {});

    /* whole queueing system to process batch of mongo queries */
    let endpoints = [];
    const paginatorCallback = async ({ queryStringParameters }, doneCallback) => {
      const localResults = await search([...pipeline], queryStringParameters || {});
      endpoints = endpoints.concat(flatten(localResults.crowd.map(fan => fan.endpoints)));
      doneCallback();
    };
    const searchAndBlast = queue(paginatorCallback, 20);
    const searchAndBlastDone = new Promise((resolve) => {
      searchAndBlast.drain(async () => {
        const { project } = event.queryStringParameters;
        const params = {
          FunctionName: `blast-${STAGE}-blastNotification`,
          Payload: JSON.stringify({
            artistName,
            endpoints,
            message,
            opts: { userId, projectId: project, appId },
          }),
        };
        const res = await lambda.invoke(params).promise();
        resolve();
        callback(null, response({ code: 200, body: res }));
      });
    });

    /* Loop to iterate data in order to avoid size error from mongo */
    const { limit } = event.queryStringParameters;
    for (let i = 0; i * MAXIMUM_DATA_FETCHED_PER_PAGE < limit; i += 1) {
      ((page, batchProcessed) => {
        const localQS = Object.assign(
          {},
          event.queryStringParameters,
          { page, limit: Math.min(MAXIMUM_DATA_FETCHED_PER_PAGE, batchProcessed) },
        );
        searchAndBlast.push({ queryStringParameters: localQS });
      })(i + 1, limit - (i * MAXIMUM_DATA_FETCHED_PER_PAGE));
    }

    await searchAndBlastDone;
  } catch (e) {
    winston.error(e);
    callback(null, response({ code: 500, message: e.message }));
  }
};

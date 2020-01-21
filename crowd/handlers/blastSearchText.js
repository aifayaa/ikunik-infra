import queue from 'async/queue';
import Lambda from 'aws-sdk/clients/lambda';
import winston from 'winston';
import phone from 'phone';
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

export default async (event) => {
  try {
    /* Some base variables */
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const { message } = JSON.parse(event.body);
    Object.assign(event.queryStringParameters, { hasText: true });
    const pipeline = buildPipeline(userId, appId, event.queryStringParameters || {});

    /* whole queueing system to process batch of mongo queries */
    let phones = [];
    const paginatorCallback = async ({ queryStringParameters }, doneCallback) => {
      const localResults = await search([...pipeline], queryStringParameters || {});
      phones = phones.concat(localResults.crowd.map((fan) => phone(fan.user.profile.phone)[0])
        .filter((phoneNumber) => phoneNumber));
      doneCallback();
    };
    const searchAndBlast = queue(paginatorCallback, 20);

    /* Loop to iterate data in order to avoid size error from mongo */
    const { limit } = event.queryStringParameters;
    for (let i = 0; i * MAXIMUM_DATA_FETCHED_PER_PAGE < limit; i += 1) {
      ((page, batchProcessed) => {
        const localQS = {

          ...event.queryStringParameters,
          page,
          limit: Math.min(MAXIMUM_DATA_FETCHED_PER_PAGE, batchProcessed),
        };
        searchAndBlast.push({ queryStringParameters: localQS });
      })(i + 1, limit - (i * MAXIMUM_DATA_FETCHED_PER_PAGE));
    }

    await searchAndBlast.drain();
    const { project } = event.queryStringParameters;
    const params = {
      FunctionName: `blast-${STAGE}-blastText`,
      Payload: JSON.stringify({
        phones,
        message,
        opts: { userId, projectId: project, appId },
      }),
    };
    const res = await lambda.invoke(params).promise();
    return response({ code: 200, body: res });
  } catch (e) {
    winston.error(e);
    return response({ code: 500, message: e.message });
  }
};

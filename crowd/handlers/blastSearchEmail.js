/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import queue from 'async/queue';
import buildPipeline from '../lib/pipelines/crowdPipeline';
import response from '../../libs/httpResponses/response';
import search from '../lib/search';

const { REGION, STAGE } = process.env;

const lambda = new Lambda({
  region: REGION,
});

const MAXIMUM_DATA_FETCHED_PER_PAGE = 500;

// To avoid getting a warning with lint
const jsConsole = console;

export default async (event) => {
  try {
    /* Some base variables */
    const {
      principalId: userId,
      appId,
      profileId,
    } = event.requestContext.authorizer;
    const { subject, template } = JSON.parse(event.body);
    Object.assign(event.queryStringParameters, { hasEmail: true });
    const pipeline = buildPipeline(
      userId,
      appId,
      event.queryStringParameters || {}
    );
    /* whole queueing system to process batch of mongo queries */
    let contacts = [];
    const paginatorCallback = async (
      { queryStringParameters },
      doneCallback
    ) => {
      const localResults = await search(
        [...pipeline],
        queryStringParameters || {}
      );
      contacts = contacts.concat(
        localResults.crowd.map((fan) => ({
          email:
            fan.user.email ||
            fan.user.profile.email ||
            (fan.user.emails && fan.user.emails[0].address),
          name: fan.user.profile.username,
        }))
      );
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
      })(i + 1, limit - i * MAXIMUM_DATA_FETCHED_PER_PAGE);
    }

    await searchAndBlast.drain();
    const { project } = event.queryStringParameters;
    const params = {
      FunctionName: `blast-${STAGE}-blastEmail`,
      Payload: JSON.stringify({
        contacts,
        subject,
        template,
        opts: { profileId, projectId: project, appId },
      }),
    };
    const res = await lambda.invoke(params).promise();
    return response({ code: 200, body: res });
  } catch (e) {
    jsConsole.error(e);
    return response({ code: 500, message: e.message });
  }
};

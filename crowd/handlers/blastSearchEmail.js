import Lambda from 'aws-sdk/clients/lambda';
import winston from 'winston';
import buildPipeline from '../lib/buildPipeline';
import search from '../lib/search';
import response from '../../libs/httpResponses/response';

const {
  REGION,
  STAGE,
} = process.env;

const lambda = new Lambda({
  region: REGION,
});

export default async (event, _context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const { subject, template } = JSON.parse(event.body);
    Object.assign(event.queryStringParameters, { hasEmail: true });
    const pipeline = buildPipeline(userId, appId, event.queryStringParameters || {});
    const results = await search(pipeline, event.queryStringParameters || {});
    const contacts = results.crowd.map(fan => ({
      email: fan.user.email || fan.user.profile.email || fan.user.emails[0].address,
      name: fan.user.profile.username,
    }));
    const { project } = event.queryStringParameters;
    const params = {
      FunctionName: `blast-${STAGE}-blastEmail`,
      Payload: JSON.stringify({
        contacts,
        subject,
        template,
        opts: { userId, projectId: project, appId },
      }),
    };
    const res = await lambda.invoke(params).promise();
    callback(null, response({ code: 200, body: res }));
  } catch (e) {
    winston.error(e);
    callback(null, response({ code: 500, message: e.message }));
  }
};

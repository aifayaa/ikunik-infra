import Lambda from 'aws-sdk/clients/lambda';
import winston from 'winston';
import phone from 'phone';
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
export default async (event) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const { message } = JSON.parse(event.body);
    Object.assign(event.queryStringParameters, { hasText: true });
    const pipeline = buildPipeline(userId, appId, event.queryStringParameters || {});
    const results = await search(pipeline, event.queryStringParameters || {});
    const phones = results.crowd.map(fan => phone(fan.user.profile.phone)[0])
      .filter(phoneNumber => phoneNumber);
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

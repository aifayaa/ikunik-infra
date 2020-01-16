import Lambda from 'aws-sdk/clients/lambda';
import get from 'lodash/get';
import getUser from '../lib/getUser';
import response from '../../libs/httpResponses/response';

const lambda = new Lambda({
  region: process.env.REGION,
});

export default async (event,) => {
  const { appId } = event.requestContext.authorizer;
  const userId = event.pathParameters.id;
  try {
    // TODO: check if user is a fan of artist when DB repaired
    const { subject, template } = JSON.parse(event.body);
    const user = await getUser(userId);
    const contacts = [{
      email: user.email || get(user, 'profile.email') || get(user, 'emails[0].address'),
      name: user.firstname || get(user, 'profile.firstname') || user.username || get(user, 'profile.username', ''),
    }];

    // To charge the user profile if this method is called from http
    const opts = { appId };
    if (event.httpMethod) opts.userId = event.requestContext.authorizer.principalId;
    const params = {
      FunctionName: `blast-${process.env.STAGE}-blastEmail`,
      Payload: JSON.stringify({ contacts, subject, template, opts }),
    };
    const res = await lambda.invoke(params).promise();
    return response({ code: 200, body: res });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

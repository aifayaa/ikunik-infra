/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import phone from 'phone';
import getUser from '../lib/getUser';
import response from '../../libs/httpResponses/response';

const lambda = new Lambda({
  region: process.env.REGION,
});

export default async (event) => {
  try {
    // TODO: check if user is a fan of artist when DB repaired
    const { appId, profileId } = event.requestContext.authorizer;
    const userId = event.pathParameters.id;
    const { message } = JSON.parse(event.body);
    const user = await getUser(userId);
    const phones = [phone(user.profile.phone)[0]];

    // To charge the user profile if this method is called from http
    const opts = { appId };
    if (event.httpMethod) opts.profileId = profileId;
    const params = {
      FunctionName: `blast-${process.env.STAGE}-blastText`,
      Payload: JSON.stringify({ phones, message, opts }),
    };
    const res = await lambda.invoke(params).promise();
    return response({ code: 200, body: res });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

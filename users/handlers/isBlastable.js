/* eslint-disable import/no-relative-packages */
import getEndpoints from '../lib/getEndpoints';
import getUser from '../lib/getUser';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  try {
    const userId = event.pathParameters.id;
    const { appId } = event.requestContext.authorizer;
    const [endpoints, user] = await Promise.all([
      getEndpoints(userId, appId),
      getUser(userId),
    ]);
    const results = {
      email: !!(user.email || user.profile.email || user.emails[0].address),
      notifications: !!endpoints,
      text: !!user.profile.phone,
    };
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

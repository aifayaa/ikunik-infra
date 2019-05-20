import response from '../../libs/httpResponses/response';
import getCredits from '../lib/getCredits';

export default async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const results = await getCredits(userId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

import getPayouts from '../lib/getPayouts';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const results = await getPayouts(appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

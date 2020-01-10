import getPayouts from '../lib/getPayouts';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const results = await getPayouts(appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

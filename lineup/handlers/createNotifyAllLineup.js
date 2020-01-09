import response from '../../libs/httpResponses/response';
import createNotifyAll from '../lib/createNotifyAll';

export default async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const results = await createNotifyAll(appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

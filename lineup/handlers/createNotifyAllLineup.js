import response from '../../libs/httpResponses/response';
import createNotifyAll from '../lib/createNotifyAll';

export default async (event, _context, callback) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const results = await createNotifyAll(appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

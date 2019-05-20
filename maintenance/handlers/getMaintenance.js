import getMaintenance from '../lib/getMaintenance';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const msg = await getMaintenance(appId);
    callback(null, response({ code: 200, body: msg || {} }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

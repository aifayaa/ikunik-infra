import isUserSubscribed from '../lib/isUserSubscribed';
import response from '../../libs/httpResponses/response';

export default async ({ userId, subIds, appId }, _context, callback) => {
  try {
    const results = await isUserSubscribed(userId, subIds, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

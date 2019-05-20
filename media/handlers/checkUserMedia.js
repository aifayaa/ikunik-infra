import checkUserMedia from '../lib/checkUserMedia';
import response from '../../libs/httpResponses/response';

export default async ({ userId, mediaIds, appId }, _context, callback) => {
  try {
    const results = await checkUserMedia(userId, appId, mediaIds);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

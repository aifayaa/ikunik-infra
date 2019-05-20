import response from '../../libs/httpResponses/response';
import addCredits from '../lib/addCredits';

// TODO make auth on top of this method
// only authorize internal requester (our services only)
export default async ({ userId, appId, amount }, _context, callback) => {
  try {
    const results = await addCredits(userId, appId, amount);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

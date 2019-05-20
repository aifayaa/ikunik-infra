import response from '../../libs/httpResponses/response';
import removeCredits from '../lib/removeCredits';

export default async ({ userId, appId, amount }, context, callback) => {
  try {
    const results = await removeCredits(userId, appId, amount);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

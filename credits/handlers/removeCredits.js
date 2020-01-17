import response from '../../libs/httpResponses/response';
import removeCredits from '../lib/removeCredits';

export default async ({ userId, appId, amount }) => {
  try {
    const results = await removeCredits(userId, appId, amount);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

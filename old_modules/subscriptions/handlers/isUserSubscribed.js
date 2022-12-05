import isUserSubscribed from '../lib/isUserSubscribed';
import response from '../../libs/httpResponses/response';

export default async ({ userId, subIds, appId }) => {
  try {
    const results = await isUserSubscribed(userId, subIds, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

/* eslint-disable import/no-relative-packages */
import checkUserMedia from '../lib/checkUserMedia';
import response from '../../libs/httpResponses/response.ts';

export default async ({ userId, mediaIds, appId }) => {
  try {
    const results = await checkUserMedia(userId, appId, mediaIds);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

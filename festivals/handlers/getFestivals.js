import doGetFestivals from '../lib/getFestivals';
import response from '../../libs/httpResponses/response';

export const handleGetFestivals = async (event, _context, callback) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await doGetFestivals(appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

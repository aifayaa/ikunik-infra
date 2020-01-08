import doGetFestival from '../lib/getFestival';
import response from '../../libs/httpResponses/response';

export const handleGetFestival = async (event, _context, callback) => {
  const festivalId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await doGetFestival(festivalId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

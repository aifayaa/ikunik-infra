import doGetStages from '../lib/getStages';
import response from '../../libs/httpResponses/response';

export const handleGetStages = async (event) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await doGetStages(appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

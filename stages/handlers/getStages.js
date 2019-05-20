import doGetStages from '../lib/getStages';
import response from '../../libs/httpResponses/response';

export const handleGetStages = async (event, context, callback) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await doGetStages(appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

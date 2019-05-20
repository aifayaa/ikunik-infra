import doGetStage from '../lib/getStage';
import response from '../../libs/httpResponses/response';

export const handleGetStage = async (event, context, callback) => {
  const stageId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await doGetStage(stageId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

import doGetStage from '../lib/getStage';
import response from '../../libs/httpResponses/response';

export const handleGetStage = async (event) => {
  const stageId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await doGetStage(stageId, appId);
    if (results) {
      return response({ code: 200, body: results });
    }
    return response({ code: 500, message: 'stage_not_found' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

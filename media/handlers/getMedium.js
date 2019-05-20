import getMedium from '../lib/getMedium';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const mediumType = event.pathParameters.type;
    const mediumId = event.pathParameters.id;
    const results = await getMedium(userId, appId, mediumType, mediumId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

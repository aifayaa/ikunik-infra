/* eslint-disable import/no-relative-packages */
import getMedium from '../lib/getMedium';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const mediumType = event.pathParameters.type;
    const mediumId = event.pathParameters.id;
    const results = await getMedium(userId, appId, mediumType, mediumId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

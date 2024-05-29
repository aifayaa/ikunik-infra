/* eslint-disable import/no-relative-packages */
import isMediaLocked from '../lib/isMediaLocked';
import getMedium from '../lib/getMedium';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const mediumType = event.pathParameters.type;
    const mediumId = event.pathParameters.id;
    const medium = await getMedium(userId, appId, mediumType, mediumId);
    const result = await isMediaLocked(userId, appId, medium);
    return response({ code: 200, body: result });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

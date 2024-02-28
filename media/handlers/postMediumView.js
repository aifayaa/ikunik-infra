/* eslint-disable import/no-relative-packages */
import postMediumView from '../lib/postMediumView';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const mediumType = event.pathParameters.type;
    const mediumId = event.pathParameters.id;
    const results = await postMediumView(userId, appId, mediumType, mediumId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

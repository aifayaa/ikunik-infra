/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import ugcView from '../lib/ugcView';

export default async (event) => {
  const articleId = event.pathParameters.id;
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { deviceId } = event.queryStringParameters || {};

  try {
    const ok = await ugcView(appId, articleId, userId || deviceId);
    return response({ code: 200, body: ok });
  } catch (e) {
    return response(errorMessage(e));
  }
};

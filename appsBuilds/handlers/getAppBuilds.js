/* eslint-disable import/no-relative-packages */
import getAppBuilds from '../lib/getAppBuilds';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const pathAppId = event.pathParameters && event.pathParameters.id;
  const authorizerAppId =
    event.requestContext &&
    event.requestContext.authorizer &&
    event.requestContext.authorizer.appId;

  try {
    const appId = pathAppId || authorizerAppId;

    const results = await getAppBuilds(appId);

    if (results === false) {
      return response({ code: 404, message: 'app_not_found' });
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

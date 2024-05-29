/* eslint-disable import/no-relative-packages */
import getAppSettings from '../lib/getAppSettings';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await getAppSettings(appId);

    if (results === false) {
      return response({ code: 404, message: 'app_not_found' });
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

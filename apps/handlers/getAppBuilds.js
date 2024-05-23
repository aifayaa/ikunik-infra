/* eslint-disable import/no-relative-packages */
import getAppBuilds from '../lib/getAppBuilds';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const appId = event.pathParameters.id;

  try {
    const results = await getAppBuilds(appId);

    if (results === false) {
      return response({ code: 404, message: 'app_not_found' });
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

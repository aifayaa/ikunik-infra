import getAppSettings from '../lib/getAppSettings';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await getAppSettings(appId);

    if (results === false) {
      callback(null, response({ code: 404, message: 'app_not_found' }));
    } else {
      callback(null, response({ code: 200, body: results }));
    }
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

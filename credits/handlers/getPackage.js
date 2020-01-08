import getPackage from '../lib/getPackage';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const { id } = event.pathParameters;
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await getPackage(id, appId);
    if (results) {
      return response({ code: 200, body: results });
    } else {
      return response({ code: 404, message: 'package_not_found' });
    }
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

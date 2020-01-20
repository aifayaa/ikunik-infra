import getPackages from '../lib/getPackages';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await getPackages(appId);
    if (results) {
      return response({ code: 200, body: results });
    }
    return response({ code: 404, message: 'packages_not_found' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

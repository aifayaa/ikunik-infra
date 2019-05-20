import getPackages from '../lib/getPackages';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await getPackages(appId, event.queryStringParameters || {});
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

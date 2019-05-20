import search from '../lib/search';
import response from '../../libs/httpResponses/response';

export const handleSearch = async (event, context, callback) => {
  try {
    const { text } = event.queryStringParameters || {};
    const { appId } = event.requestContext.authorizer;
    const results = await search(text, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

import response from '../../libs/httpResponses/response';
import search from '../lib/search';

export const handleSearch = async (event, _context, callback) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const { text, skip, limit } = event.queryStringParameters || {};
    const results = await search(
      text,
      appId,
      {
        skip: parseInt(skip, 10) || undefined,
        limit: parseInt(limit, 10) || undefined,
      },
    );
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

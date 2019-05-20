import createIndex from '../lib/createIndex';
import response from '../../libs/httpResponses/response';

export const handleCreateIndex = async (event, _context, callback) => {
  try {
    const results = await createIndex();
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

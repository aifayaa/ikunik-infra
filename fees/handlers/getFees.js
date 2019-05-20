import getFees from '../lib/getFees';
import response from '../../libs/httpResponses/response';

export default async (_event, _context, callback) => {
  try {
    const results = await getFees();
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

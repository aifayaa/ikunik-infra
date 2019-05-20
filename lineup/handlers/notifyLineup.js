import notifyLineup from '../lib/notifyLineup';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  try {
    const { lineupId } = event;
    const results = await notifyLineup(lineupId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

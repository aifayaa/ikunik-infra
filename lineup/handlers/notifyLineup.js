import notifyLineup from '../lib/notifyLineup';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { lineupId } = event;
    const results = await notifyLineup(lineupId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

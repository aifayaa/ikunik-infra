import getFees from '../lib/getFees';
import response from '../../libs/httpResponses/response';

export default async () => {
  try {
    const results = await getFees();
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

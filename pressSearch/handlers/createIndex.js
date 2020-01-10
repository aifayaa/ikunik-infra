import createIndex from '../lib/createIndex';
import response from '../../libs/httpResponses/response';

export const handleCreateIndex = async () => {
  try {
    const results = await createIndex();
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

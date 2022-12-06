import putPayout from '../lib/putPayout';
import response from '../../libs/httpResponses/response';

export const handlePutPayout = async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const { id, resp } = JSON.parse(event.body);
    if (!id || typeof resp !== 'boolean') {
      throw new Error('malformed_request');
    }
    const results = await putPayout(id, resp, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

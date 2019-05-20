import putPayout from '../lib/putPayout';
import response from '../../libs/httpResponses/response';

export const handlePutPayout = async (event, context, callback) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const { id, resp } = JSON.parse(event.body);
    if (!id || typeof resp !== 'boolean') {
      throw new Error('mal formed request');
    }
    const results = await putPayout(id, resp, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

import response from '../libs/httpResponses/response';

export const handleGetPress = async (event, context, callback) => {
  try {
    callback(null, response({ code: 200, body: 'API PRESS OK' }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
